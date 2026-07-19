/**
 * bluetoothService.js — Web Bluetooth (BLE) integration
 *
 * Connects to standard GATT-profile devices (heart rate monitors, fitness
 * bands/watches) using the browser-native Web Bluetooth API. No SDKs,
 * no native app required — Chrome / Edge only (Web Bluetooth spec).
 *
 * Standard GATT service/characteristic UUIDs used here are the official
 * 16-bit aliases resolved by the browser (e.g. 'heart_rate' → 0x180D).
 */

const HEART_RATE_SERVICE = 'heart_rate'
const HEART_RATE_MEASUREMENT_CHARACTERISTIC = 'heart_rate_measurement'
const BATTERY_SERVICE = 'battery_service'
const BATTERY_LEVEL_CHARACTERISTIC = 'battery_level'
const FITNESS_MACHINE_SERVICE = 'fitness_machine'

export function isBluetoothSupported() {
  return typeof navigator !== 'undefined' && !!navigator.bluetooth
}

/**
 * Parses the Heart Rate Measurement characteristic value per the
 * Bluetooth SIG spec: byte 0 is a flags bitmask, bit 0 tells us whether
 * the heart rate value is 8-bit (bpm) or 16-bit.
 */
function parseHeartRateValue(dataView) {
  const flags = dataView.getUint8(0)
  const is16Bit = (flags & 0x1) === 1
  return is16Bit ? dataView.getUint16(1, /* littleEndian */ true) : dataView.getUint8(1)
}

/**
 * Opens the browser's native device picker filtered to devices exposing
 * one of the standard fitness GATT services, connects, and subscribes to
 * live heart rate notifications + a one-time battery level read.
 *
 * @param {Object} callbacks
 * @param {(bpm: number) => void} callbacks.onHeartRate
 * @param {(percent: number) => void} callbacks.onBattery
 * @param {() => void} callbacks.onDisconnect
 * @returns {Promise<{device: BluetoothDevice, deviceName: string, hasHeartRate: boolean, hasBattery: boolean, disconnect: () => void}>}
 */
export async function connectHealthDevice({ onHeartRate, onBattery, onDisconnect } = {}) {
  if (!isBluetoothSupported()) {
    throw new Error('Web Bluetooth is not supported in this browser. Please use Chrome or Edge.')
  }

  const device = await navigator.bluetooth.requestDevice({
    filters: [
      { services: [HEART_RATE_SERVICE] },
      { services: [BATTERY_SERVICE] },
      { services: [FITNESS_MACHINE_SERVICE] },
    ],
    optionalServices: [HEART_RATE_SERVICE, BATTERY_SERVICE, FITNESS_MACHINE_SERVICE, 'device_information'],
  })

  const handleGattDisconnect = () => onDisconnect?.()
  device.addEventListener('gattserverdisconnected', handleGattDisconnect)

  const server = await device.gatt.connect()

  let hasHeartRate = false
  let hasBattery = false
  let hrCharacteristic = null
  let hrListener = null

  try {
    const hrService = await server.getPrimaryService(HEART_RATE_SERVICE)
    hrCharacteristic = await hrService.getCharacteristic(HEART_RATE_MEASUREMENT_CHARACTERISTIC)
    await hrCharacteristic.startNotifications()
    hrListener = (event) => {
      const bpm = parseHeartRateValue(event.target.value)
      onHeartRate?.(bpm)
    }
    hrCharacteristic.addEventListener('characteristicvaluechanged', hrListener)
    hasHeartRate = true
  } catch {
    // Device doesn't expose the heart rate service — that's fine.
  }

  try {
    const batteryService = await server.getPrimaryService(BATTERY_SERVICE)
    const batteryChar = await batteryService.getCharacteristic(BATTERY_LEVEL_CHARACTERISTIC)
    const value = await batteryChar.readValue()
    onBattery?.(value.getUint8(0))
    hasBattery = true
  } catch {
    // Device doesn't expose battery info — that's fine.
  }

  return {
    device,
    deviceName: device.name || 'Unknown Device',
    hasHeartRate,
    hasBattery,
    disconnect() {
      device.removeEventListener('gattserverdisconnected', handleGattDisconnect)
      if (hrCharacteristic && hrListener) {
        try { hrCharacteristic.removeEventListener('characteristicvaluechanged', hrListener) } catch { /* ignore */ }
        try { hrCharacteristic.stopNotifications() } catch { /* ignore */ }
      }
      if (device.gatt?.connected) device.gatt.disconnect()
    },
  }
}