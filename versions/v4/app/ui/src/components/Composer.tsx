// 输入区:圆角边框盒 + 底部操作行。
// Enter 发送,Shift+Enter 换行,IME 组合中不触发发送;
// 运行中仍可发送(App 会排队并在本轮结束后追跑),停止按钮与发送并列。
// 选择 / 粘贴 / 拖拽三条路都通,进来的东西分两类:
//   图片   → Responses 标准 input_image(data URL),给模型的眼睛;
//   其他文件 → 上传落 var/files,输入框插入落地路径,agent 用工具自己读。
//   (浏览器拿不到拖拽文件的真实路径,复制一份是拖拽的宿命;
//    直接粘贴本地路径文本则零拷贝,agent 本来就能读全盘。)
import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import * as api from '../api';
import { Icon } from './Icon';

/** 起手式填进来的内容。带序号:同一条连点两次也要重新填。 */
export interface ComposerSeed { text: string; n: number }

interface ComposerProps {
  onSend: (text: string, images?: string[]) => void;
  busy: boolean;
  onStop: () => void;
  seed: ComposerSeed | null;
}

interface Attachment { id: number; url: string }

function fileToDataUrl(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('读取失败'));
    reader.readAsDataURL(file);
  });
}

/** 图片专用:大图缩到长边 2048 转 JPEG,压请求体和模型输入。 */
async function imageToDataUrl(file: File): Promise<string> {
  const raw = await fileToDataUrl(file);
  if (raw.length < 2_000_000) return raw;
  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = () => reject(new Error('图片解码失败'));
    img.src = raw;
  });
  const scale = Math.min(1, 2048 / Math.max(img.width, img.height, 1));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.85);
}

export const Composer = memo(function Composer({ onSend, busy, onStop, seed }: ComposerProps) {
  const [value, setValue] = useState('');
  const [images, setImages] = useState<Attachment[]>([]);
  const [dragging, setDragging] = useState(false);
  const composing = useRef(false);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(0);
  // 拖拽在子元素间穿梭会连发 enter/leave,计数归零才算真正离开
  const dragDepth = useRef(0);

  // 起手式是范例不是按钮:填进输入框等用户改,不直接发
  useEffect(() => {
    if (!seed) return;
    setValue(seed.text);
    areaRef.current?.focus();
  }, [seed]);

  // 高度跟随内容,来源(键入 / 起手式 / 发送清空)一视同仁
  useLayoutEffect(() => {
    const element = areaRef.current;
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${Math.min(element.scrollHeight, 220)}px`;
  }, [value]);

  // 落地路径插进输入框,和已有文字用换行隔开
  const insertPath = (path: string) => {
    setValue((current) => (current.trim() ? `${current.replace(/\s+$/, '')}\n${path}` : path));
    areaRef.current?.focus();
  };

  const addFiles = (files: Iterable<File>) => {
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        const id = ++nextId.current;
        void imageToDataUrl(file)
          .then((url) => setImages((current) => [...current, { id, url }]))
          .catch(() => { /* 读不出来的略过 */ });
      } else {
        void fileToDataUrl(file)
          .then((data) => api.uploadFile(file.name, data))
          .then(({ path }) => insertPath(path))
          .catch((e: Error) => insertPath(`(文件上传失败: ${e.message})`));
      }
    }
  };

  const submit = () => {
    const text = value.trim();
    if (!text && !images.length) return;
    onSend(text, images.map((one) => one.url));
    setValue('');
    setImages([]);
  };

  return (
    <footer className="composer-wrap">
      <div
        className={`composer${dragging ? ' dragging' : ''}`}
        onClick={() => areaRef.current?.focus()}
        onDragEnter={(e) => { e.preventDefault(); dragDepth.current += 1; setDragging(true); }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => { dragDepth.current -= 1; if (dragDepth.current <= 0) { dragDepth.current = 0; setDragging(false); } }}
        onDrop={(e) => {
          e.preventDefault();
          dragDepth.current = 0;
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
      >
        {images.length > 0 && (
          <div className="composer-files">
            {images.map((one) => (
              <span key={one.id} className="composer-file">
                <img src={one.url} alt="" />
                <button
                  className="composer-file-del"
                  title="移除"
                  aria-label="移除图片"
                  onClick={(e) => { e.stopPropagation(); setImages((current) => current.filter((item) => item.id !== one.id)); }}
                >
                  <Icon name="close" size={10} />
                </button>
              </span>
            ))}
          </div>
        )}
        <textarea
          ref={areaRef}
          rows={2}
          placeholder="输入消息,Enter 发送,Shift+Enter 换行"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onCompositionStart={() => { composing.current = true; }}
          onCompositionEnd={() => { composing.current = false; }}
          onPaste={(e) => {
            const files = [...e.clipboardData.items]
              .filter((item) => item.kind === 'file')
              .map((item) => item.getAsFile())
              .filter((file): file is File => !!file);
            if (files.length) {
              e.preventDefault();
              addFiles(files);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && !composing.current) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <div className="composer-toolbar">
          <button
            className="round attach"
            title="添加图片或文件"
            aria-label="添加图片或文件"
            onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
          >
            <Icon name="plus" size={15} />
          </button>
          <span className="grow" />
          {/* 一个位置一个按钮:运行中就是停止,空闲就是发送。
              运行中仍可 Enter 发送排队,只是不占第二个图标位 */}
          {busy ? (
            <button className="round stop" title="停止" onClick={(e) => { e.stopPropagation(); onStop(); }}>
              <Icon name="stop" size={14} />
            </button>
          ) : (
            <button className="round send" title="发送" disabled={!value.trim() && !images.length} onClick={(e) => { e.stopPropagation(); submit(); }}>
              <Icon name="send" size={16} />
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>
    </footer>
  );
});
