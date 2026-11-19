import path from 'path';

export function avatarFileName(avatar) {
  if (!avatar) return '';
  return path.basename(String(avatar).split('?')[0]);
}

export function avatarPublicUrl(avatar) {
  const name = avatarFileName(avatar);
  if (!name) return null;
  const value = String(avatar);
  if (value.startsWith('http://') || value.startsWith('https://')) return value.split('?')[0];
  if (value.includes('/uploads/avatars/') || value.includes('/api/media/avatars/')) {
    return `/api/media/avatars/${name}`;
  }
  return value.startsWith('/') ? value.split('?')[0] : `/${value}`;
}

export function avatarDiskPaths(avatar) {
  const name = avatarFileName(avatar);
  if (!name) return [];
  return [
    path.join(process.cwd(), 'uploads', 'avatars', name),
    path.join(process.cwd(), 'public', 'uploads', 'avatars', name),
  ];
}
