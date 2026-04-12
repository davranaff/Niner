export type AdminOffsetPage<TItem> = {
  items: TItem[];
  limit: number;
  offset: number;
};

export type AdminLoadMorePage<TItem> = {
  items: TItem[];
  limit: number;
  offset: number;
  page: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

export type AdminMutationResponse = {
  id: number;
};

export type AdminDeleteResponse = {
  message: string;
};

export type AdminFlatMetaItem = {
  label: string;
  value: string;
};
