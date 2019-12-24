export enum MemoryDataStorageKey {
  'SealList',
  'NewUserList'
}

const memoryData: Map<MemoryDataStorageKey, Set<string>> = new Map()

export function setMemoryData(key: MemoryDataStorageKey, set: Set<string>) {
  memoryData.set(key, set)
}

export function addMemoryData(key: MemoryDataStorageKey, value: string) {
  if (value) {
    const set = memoryData.get(key)
    set.add(value)
  }
}

export function getMemoryData(key: MemoryDataStorageKey) {
  return memoryData.get(key)
}

export function existMemoryData(key: MemoryDataStorageKey, value: string) {
  return memoryData.get(key).has(value)
}

export function deleteMemoryData(key: MemoryDataStorageKey, value: string) {
  if (value) {
    const set = memoryData.get(key)
    set.delete(value)
  }
}

setMemoryData(MemoryDataStorageKey.SealList, new Set())
setMemoryData(MemoryDataStorageKey.NewUserList, new Set())
