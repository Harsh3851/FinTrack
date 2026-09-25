import { API_URL, DATA_MODE } from '../config';
import { createDemoSource } from './demo/source';
import { createHttpSource } from './http/source';
import type { DataSource } from './types';

export const dataSource: DataSource =
  DATA_MODE === 'api' ? createHttpSource(API_URL) : createDemoSource();
export type { DataSource };
