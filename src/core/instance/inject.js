/* @flow */

import { hasOwn } from 'shared/util'
import { warn, hasSymbol } from '../util/index'
import { defineReactive, toggleObserving } from '../observer/index'

export function initProvide (vm: Component) {
  const provide = vm.$options.provide
  if (provide) {
    vm._provided = typeof provide === 'function'
      ? provide.call(vm)
      : provide
  }
}

export function initInjections (vm: Component) {
  // 获取
  const result = resolveInject(vm.$options.inject, vm)
  if (result) {
    // 标记当前数据不需要进行响应式操作
    toggleObserving(false)
    Object.keys(result).forEach(key => {
      /* istanbul ignore else */
      if (process.env.NODE_ENV !== 'production') {
        defineReactive(vm, key, result[key], () => {
          warn(
            `Avoid mutating an injected value directly since the changes will be ` +
            `overwritten whenever the provided component re-renders. ` +
            `injection being mutated: "${key}"`,
            vm
          )
        })
      } else {
        // 将当前的inject属性绑定到vm实例对象上
        defineReactive(vm, key, result[key])
      }
    })
    toggleObserving(true)
  }
}

export function resolveInject (inject: any, vm: Component): ?Object {
  if (inject) {
    console.log('inject: ',inject);
    // inject is :any because flow is not smart enough to figure out cached
    const result = Object.create(null)
    // 获取inject的key如inject={ getRootName: ['getParentName', 'getGrandpaName'] } -> keys: [ 'getRootName' ]
    const keys = hasSymbol
      ? Reflect.ownKeys(inject)
      : Object.keys(inject)
    console.log('keys: ',keys)
    // 遍历获取到的keys
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      // #6574 in case the inject object is observed...
      if (key === '__ob__') continue
      // 获取当前实例inject绑定的provide的key
      const provideKey = inject[key].from
      let source = vm
      // 递归获取祖先的provide，查询祖先的provide是否存在provideKey
      while (source) {
        if (source._provided && hasOwn(source._provided, provideKey)) {
          // 获取当前实例的provide
          result[key] = source._provided[provideKey]
          break
        }
        // 获取父级实例
        source = source.$parent
      }
      if (!source) {
        // 判断是否存在默认值
        if ('default' in inject[key]) {
          const provideDefault = inject[key].default
          result[key] = typeof provideDefault === 'function'
            ? provideDefault.call(vm)
            : provideDefault
        } else if (process.env.NODE_ENV !== 'production') {
          warn(`Injection "${key}" not found`, vm)
        }
      }
    }
    return result
  }
}
