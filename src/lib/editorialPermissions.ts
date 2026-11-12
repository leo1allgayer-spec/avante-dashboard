import { isSocialOperationUser } from "./accessControl";
export function isEditorialPrimary(email?: string | null) {
  return email?.trim().toLowerCase() === 'digitalavante3@gmail.com' || isSocialOperationUser(email);
}
