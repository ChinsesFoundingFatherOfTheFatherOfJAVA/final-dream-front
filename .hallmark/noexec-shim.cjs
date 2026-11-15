// 临时沙箱 shim（验证用，验证后删除）：本环境 child_process.exec 被 EPERM 拒绝且同步抛出，
// vite 的 optimizeSafeRealPathSync 会 exec("net use") 探测网络盘映射。exec 优雅失败时 vite
// 走自带回退分支（fs.realpathSync.native），对本地 D: 盘完全等价，因此把 exec 置为"立即失败回调"。
const cp = require('node:child_process')
const { EventEmitter } = require('node:events')
cp.exec = function noopExec(cmd, opts, cb) {
  if (typeof opts === 'function') { cb = opts; opts = undefined }
  const err = new Error('exec disabled by sandbox shim: ' + cmd)
  if (typeof cb === 'function') process.nextTick(() => cb(err))
  const fake = new EventEmitter()
  fake.kill = () => true
  return fake
}
