export type FolderTree = {
  dir: string;
  folders: FolderTree[];
  files: string[];
};
