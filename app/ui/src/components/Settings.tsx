import { useEffect, useState } from 'react';
import * as api from '../api';
import type { AiosConfig } from '../types';

type Field = { key: keyof AiosConfig; label: string; description: string; secret?: boolean };

const groups: Array<{ title: string; fields: Field[] }> = [
  { title: '模型服务', fields: [
    { key: 'responsesUrl', label: 'Responses URL', description: '完整的 Responses API 地址' },
    { key: 'apiKey', label: 'API Key', description: '模型服务密钥', secret: true },
    { key: 'model', label: 'Model', description: '模型名称' },
  ] },
  { title: '上下文与价格', fields: [
    { key: 'contextWindowTokens', label: 'Context Window', description: '模型上下文窗口(tokens),状态行水位分母' },
    { key: 'priceInputPerMTokens', label: 'Input Price', description: '输入价格(币种/百万 tokens),和输出价都为 0 时不显示花费' },
    { key: 'priceCachedPerMTokens', label: 'Cached Price', description: '缓存命中输入的价格,0 = 不打折按输入价算' },
    { key: 'priceOutputPerMTokens', label: 'Output Price', description: '输出价格(币种/百万 tokens)' },
    { key: 'priceCurrency', label: 'Currency', description: '花费显示用的币种符号' },
  ] },
  { title: '服务与路径', fields: [
    { key: 'kernelPort', label: 'Kernel Port', description: 'Kernel run API 端口' },
    { key: 'appPort', label: 'App Port', description: 'App API 和 UI 端口' },
    { key: 'workdir', label: 'Workdir', description: 'bash 默认工作目录，空值为仓库根目录' },
    { key: 'guard', label: 'Guard', description: 'bash 安全策略程序路径' },
    { key: 'tools', label: 'Tools Registry', description: '外挂工具注册表路径' },
  ] },
  { title: '工具限制', fields: [
    { key: 'bashMinTimeoutMs', label: 'Bash Min Timeout', description: 'bash 最小超时（ms）' },
    { key: 'bashDefaultTimeoutMs', label: 'Bash Default Timeout', description: 'bash 默认超时（ms）' },
    { key: 'bashTimeoutMs', label: 'Bash Max Timeout', description: 'bash 最大超时（ms）' },
    { key: 'toolTimeoutMs', label: 'Tool Timeout', description: '外挂工具超时（ms）' },
    { key: 'toolOutputMaxChars', label: 'Tool Output Limit', description: 'stdout/stderr 单流最大字符数' },
    { key: 'guardTimeoutMs', label: 'Guard Timeout', description: 'guard 咨询超时（ms）' },
  ] },
  { title: '传输与运行', fields: [
    { key: 'requestBodyMaxBytes', label: 'Request Body Limit', description: 'HTTP 请求体上限（bytes）' },
    { key: 'sseEventMaxBytes', label: 'SSE Event Limit', description: '单个 SSE 事件上限（bytes）' },
    { key: 'eventBufferSize', label: 'Event Buffer Size', description: 'App 保留的 SSE 事件数' },
    { key: 'bootReadyTimeoutMs', label: 'Boot Ready Timeout', description: '等待 Kernel 就绪（ms）' },
    { key: 'bootBackoffMaxMs', label: 'Boot Backoff Max', description: '重启退避上限（ms）' },
    { key: 'shutdownTimeoutMs', label: 'Shutdown Timeout', description: '关闭等待时间（ms）' },
    { key: 'consoleConnectTimeoutMs', label: 'Console Connect Timeout', description: 'Console 探测 App 超时（ms）' },
  ] },
];

export function Settings() {
  const [config, setConfig] = useState<AiosConfig | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getConfig().then(setConfig).catch((e: Error) => setError(e.message));
  }, []);

  if (!config) return <section id="settings"><p>{error || '正在读取配置…'}</p></section>;

  const change = (field: Field, raw: string) => {
    const current = config[field.key];
    setConfig({ ...config, [field.key]: typeof current === 'number' ? Number(raw) : raw });
    setNotice('');
  };

  const save = async () => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const result = await api.updateConfig(config);
      setConfig(result.config);
      setNotice('已保存。请重启 AIOS 使所有配置生效。');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section id="settings">
      {groups.map((group) => (
        <section className="set-card" key={group.title}>
          <h3>{group.title}</h3>
          {group.fields.map((field) => (
            <label className="field" key={field.key}>
              <span className="field-label"><strong>{field.label}</strong><small>{field.description}</small></span>
              <input
                className="input"
                type={field.secret ? 'password' : typeof config[field.key] === 'number' ? 'number' : 'text'}
                value={config[field.key]}
                min={typeof config[field.key] === 'number' ? 0 : undefined}
                onChange={(event) => change(field, event.target.value)}
              />
            </label>
          ))}
        </section>
      ))}
      {error && <p className="settings-error">{error}</p>}
      {notice && <p className="settings-notice">{notice}</p>}
      <div className="settings-actions">
        <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? '保存中…' : '保存设置'}</button>
      </div>
    </section>
  );
}
