import type { BackendWritingPart, BackendWritingTestDetail } from 'src/sections/apps/student/writing/api/types';

export type AdminWritingListItem = {
  id: number;
  title: string;
  description: string;
  timeLimit: number;
  isActive: boolean;
};

export type AdminWritingTestSettings = AdminWritingListItem;

export type AdminWritingPart = {
  id: number;
  order: number;
  testId: number;
  task: string;
  imageUrl: string | null;
  fileUrls: string[];
};

export type AdminWritingDetail = AdminWritingTestSettings & {
  createdAt: string;
  parts: AdminWritingPart[];
};

export type AdminWritingTestFormValues = {
  title: string;
  description: string;
  timeLimit: number;
  isActive: boolean;
};

export type AdminWritingPartFormValues = {
  order: number;
  task: string;
  imageUrl: string;
  fileUrlsText: string;
};

export type AdminWritingRawPart = BackendWritingPart;
export type AdminWritingRawDetail = BackendWritingTestDetail;
