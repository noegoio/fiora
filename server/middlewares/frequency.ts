import { existMemoryData, MemoryDataStorageKey } from '../memoryData'
import { KoaContext } from '../../types/koa'

const MaxCallPerMinutes = 20
const NewUserMaxCallPerMinutes = 5

/**
 * Limit interface calling frequency
 * New users are limited to 5 times per minute, old users are limited to 20 times per minute
 */
export default function frequency() {
  let callTimes = {}

  // Statistics every 60s
  setInterval(() => {
    callTimes = {}
  }, 60000)

  return async (ctx: KoaContext, next: Function) => {
    const { user } = ctx.socket

    // robot10
    if (user && user.toString() === '5adad39555703565e7903f79') {
      return next()
    }

    const socketId = ctx.socket.id
    const count = callTimes[socketId] || 0

    // New restrictions
    if (
      user &&
      existMemoryData(MemoryDataStorageKey.NewUserList, user.toString()) &&
      count > NewUserMaxCallPerMinutes
    ) {
      ctx.res =
        'The interface call failed, you are in the new limitation period, please do not operate frequently'
      return null
    }

    // 普通用户限制
    if (count > MaxCallPerMinutes) {
      ctx.res = 'The interface is called frequently, please try again later'
      return null
    }
    callTimes[socketId] = count + 1
    return next()
  }
}
