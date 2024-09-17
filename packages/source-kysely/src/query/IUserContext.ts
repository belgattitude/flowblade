export type IUserContext<TPerms extends string[] = string[]> = {
  userId: string;
  permissions: TPerms;
};
