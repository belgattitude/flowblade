// @todo see if we need organizations, etc...
import type { UserPermission } from '@/lib/data-engine/UserPermission';

export type IUserContext = {
  userId: string;
  permissions: UserPermission[];
};
