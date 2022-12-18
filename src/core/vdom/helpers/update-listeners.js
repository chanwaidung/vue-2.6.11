/* @flow */

import {
  warn,
  invokeWithErrorHandling
} from 'core/util/index'
import {
  cached,
  isUndef,
  isTrue,
  isPlainObject
} from 'shared/util'

const normalizeEvent = cached((name: string): {
  name: string,
  once: boolean,
  capture: boolean,
  passive: boolean,
  handler?: Function,
  params?: Array<any>
} => {
  console.log('name: ', name)
  const passive = name.charAt(0) === '&'
  name = passive ? name.slice(1) : name
  const once = name.charAt(0) === '~' // Prefixed last, checked first
  name = once ? name.slice(1) : name
  const capture = name.charAt(0) === '!'
  name = capture ? name.slice(1) : name
  console.log('normalizeEvent: ',{
    name,
    once,
    capture,
    passive,
  })
  return {
    name,
    once,
    capture,
    passive
  }
})

export function createFnInvoker (fns: Function | Array<Function>, vm: ?Component): Function {
  function invoker () {
    const fns = invoker.fns
    if (Array.isArray(fns)) {
      const cloned = fns.slice()
      for (let i = 0; i < cloned.length; i++) {
        invokeWithErrorHandling(cloned[i], null, arguments, vm, `v-on handler`)
      }
    } else {
      // return handler return value for single handlers
      return invokeWithErrorHandling(fns, null, arguments, vm, `v-on handler`)
    }
  }
  // 将事件回调存入invoker.fns属性
  invoker.fns = fns
  return invoker
}

export function updateListeners (
  on: Object,/*事件Map*/
  oldOn: Object,/*旧事件Map*/
  add: Function,
  remove: Function,
  createOnceHandler: Function,
  vm: Component
) {
  let name, def, cur, old, event
  // 遍历事件Map
  for (name in on) {
    // 获取当前的事件函数
    def = cur = on[name]
    old = oldOn[name]
    // 规范化事件参数，如：将事件修饰符"~"->"{ once: true }", "!"->"{ capture: true }"
    event = normalizeEvent(name)
    /* istanbul ignore if */
    if (__WEEX__ && isPlainObject(def)) {
      cur = def.handler
      event.params = def.params
    }
    // 当前事件cur未定义，抛出异常
    if (isUndef(cur)) {
      process.env.NODE_ENV !== 'production' && warn(
        `Invalid handler for event "${event.name}": got ` + String(cur),
        vm
      )
    }
    // 判断oldOn是否存在当前事件，不存在即为新增事件
    else if (isUndef(old)) {
      // 判断当前事件的cur.fns属性是否存在
      if (isUndef(cur.fns)) {
        // 构建函数触发器invoker，将当前回调函数存进cur.fns
        cur = on[name] = createFnInvoker(cur, vm)
      }
      // 判断当前事件是否为一次性函数
      if (isTrue(event.once)) {
        // 构建一次性函数
        cur = on[name] = createOnceHandler(event.name, cur, event.capture)
      }
      // 将事件添加至当前实例的vm._event内
      add(event.name, cur, event.capture, event.passive, event.params)
    }
    // 当前事件与旧事件不等，则更新旧事件为当前事件
    else if (cur !== old) {
      old.fns = cur
      on[name] = old
    }
  }
  // 遍历oldOn事件
  for (name in oldOn) {
    // 如果当前事件未定义，则移除oldOn中的旧事件
    if (isUndef(on[name])) {
      event = normalizeEvent(name)
      remove(event.name, oldOn[name], event.capture)
    }
  }
}
