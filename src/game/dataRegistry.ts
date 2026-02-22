import type { Registries } from './loadData';

let _data: Registries | null = null;

export function setRegistry(data: Registries) {
  _data = data;
}

export function getRegistry(): Registries {
  if (!_data) throw new Error('Registry not loaded yet');
  return _data;
}
