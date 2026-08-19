// 危险命令。
//
// **这不是在限制用户能干什么** —— 用户想删什么是用户的事,他有终端。
// 这里拦的是**模型自己写出来**的那几条:它把 `$VAR` 展开成了空字符串、
// 把相对路径当成了绝对路径,于是 `rm -rf /` 就出现在了参数里。
//
// 所以名单只有一条标准:**不可逆、且波及范围远超任何合理任务**。
// 「危险但合理」的东西一概不拦 —— `rm -rf node_modules`、`git reset --hard`、
// `dropdb`,那些是干活,拦了就是碍事。
//
// 拦下来当结果回喂给模型,不是抛异常:它得知道自己写了什么、为什么没跑。

const DEADLY = [
  {
    // rm -rf 打到根、家目录、或者只有一个斜杠开头的通配
    test: /\brm\s+(-[a-zA-Z]*[rR][a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*[rR]|-r\s+-f|-f\s+-r)\b[^|;&]*?\s(\/|\/\*|~|~\/\*|\$HOME|\$HOME\/\*)\s*($|[|;&])/,
    why: '这会删掉整个根目录或家目录',
  },
  {
    // 往块设备上写:抹盘
    test: /\b(mkfs(\.\w+)?|fdisk|diskutil\s+eraseDisk)\b|\bdd\b[^|;&]*\bof=\/dev\//,
    why: '这会抹掉一整块磁盘',
  },
  {
    test: />\s*\/dev\/(sd[a-z]|nvme\d|disk\d)/,
    why: '这会直接覆写块设备',
  },
  {
    // fork 炸弹
    test: /:\s*\(\s*\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:/,
    why: '这是 fork 炸弹，会把机器挂住',
  },
  {
    test: /\bchmod\s+(-[a-zA-Z]*[rR]\S*\s+)?(777|-R\s+777)\s+\/\s*($|[|;&])/,
    why: '这会把整个根目录改成任何人可写',
  },
];

/**
 * 这条命令能不能跑。不能跑就回一句为什么。
 *
 * 只看**这一条**命令的字面。不做 shell 展开、不推导变量 ——
 * 那是猜,而猜错的代价是拦住正常干活。
 */
export function deadly(command) {
  const one = String(command ?? '');
  for (const rule of DEADLY) {
    if (rule.test.test(one)) return rule.why;
  }
  return null;
}
