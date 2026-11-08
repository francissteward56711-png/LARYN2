import { describe, expect, it } from 'vitest'
import { amplitude, CSV_HEADER, demoSamples, parseSensorCsv, summarize, toCsv } from './data'
const valid = CSV_HEADER + '\n0,0,0,1,0,0,0\n50,0,0,1.4,1,2,3\n100,0,0,1,0,0,0'
describe('sensor recording import', () => {
  it('imports g and degrees/s without inventing swallow labels', () => {
    const data = parseSensorCsv(valid)
    expect(data).toHaveLength(3)
    expect(summarize(data)).toMatchObject({ duration: 0.1, rate: 20, count: 3 })
    expect(summarize(data).peak).toBeCloseTo(0.4)
    expect(Object.keys(data[0])).not.toContain('swallow')
  })
  it('accepts a UTF-8 BOM and Windows line endings', () => {
    expect(parseSensorCsv('\uFEFF' + valid.replaceAll('\n', '\r\n'))).toHaveLength(3)
  })
  it.each([
    ['unexpected columns', valid.replace('timestamp_ms', 'time'), 'header'],
    ['empty cells', valid.replace('50,0,0,1.4', '50,,0,1.4'), 'numeric'],
    ['infinite values', valid.replace('1.4', 'Infinity'), 'numeric'],
    ['repeated timestamps', valid.replace('50,0', '0,0'), 'order'],
    ['decreasing timestamps', valid.replace('100,0', '20,0'), 'order'],
    ['out-of-range acceleration', valid.replace('1.4', '17'), 'range'],
    ['out-of-range gyroscope', valid.replace('1,2,3', '2001,2,3'), 'range'],
    ['too few samples', CSV_HEADER + '\n0,0,0,1,0,0,0', 'short'],
  ])('rejects %s', (_label, csv, message) => {
    expect(() => parseSensorCsv(csv)).toThrow(message)
  })
  it('limits recording length', () => {
    expect(() =>
      parseSensorCsv(
        CSV_HEADER + '\n' + Array.from({ length: 20001 }, (_, i) => `${i},0,0,1,0,0,0`).join('\n'),
      ),
    ).toThrow('large')
  })
  it('exports and reimports a complete demo at 20 Hz', () => {
    const original = demoSamples(),
      imported = parseSensorCsv(toCsv(original))
    expect(imported).toHaveLength(1201)
    expect(summarize(imported)).toMatchObject({ duration: 60, rate: 20, count: 1201 })
    expect(summarize(imported).peak).toBeCloseTo(summarize(original).peak, 5)
  })
  it('has zero relative amplitude at rest in any orientation', () => {
    expect(amplitude({ timestamp_ms: 0, ax: 1, ay: 0, az: 0, gx: 0, gy: 0, gz: 0 })).toBe(0)
  })
})
