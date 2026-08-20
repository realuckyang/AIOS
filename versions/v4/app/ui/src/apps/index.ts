// 应用注册表。应用不是独立发行物,就是 App UI 里的视图,归类到侧栏「应用」组。
//
// 约定:一个应用 = src/apps/<id>/ 一个目录,内含
//   meta.ts    导出 `meta`(名字、图标、描述)—— 打进主包,侧栏列表用
//   index.tsx  默认导出视图组件 —— lazy 按需加载,不拖慢首屏
//   *.css      应用自己的样式,由 index.tsx 自行 import
//
// 构建时 glob 自动发现:新建目录即上架,不需要改任何现有文件。
import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

export interface AppMeta {
  id: string;
  name: string;
  /** components/Icon.tsx 里的图标名 */
  icon: string;
  description?: string;
}

const metaModules = import.meta.glob<{ meta: Omit<AppMeta, 'id'> }>('./*/meta.ts', { eager: true });
const viewModules = import.meta.glob<{ default: ComponentType }>('./*/index.tsx');

export const apps: AppMeta[] = Object.entries(metaModules)
  .map(([file, mod]) => ({ ...mod.meta, id: file.split('/')[1] }))
  .sort((a, b) => a.name.localeCompare(b.name));

const views = new Map<string, LazyExoticComponent<ComponentType>>();

export function appView(id: string): LazyExoticComponent<ComponentType> | null {
  const cached = views.get(id);
  if (cached) return cached;
  const loader = viewModules[`./${id}/index.tsx`];
  if (!loader) return null;
  const view = lazy(loader);
  views.set(id, view);
  return view;
}
