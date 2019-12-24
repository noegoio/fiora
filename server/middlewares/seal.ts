import { existMemoryData, MemoryDataStorageKey } from '../memoryData'
import { KoaContext } from '../../types/koa'
import { SealText } from '../../utils/const'

/**
 * Block requests from banned users
 */
export default function seal() {
  return async (ctx: KoaContext, next: Function) => {
    if (
      ctx.socket.user &&
      existMemoryData(MemoryDataStorageKey.SealList, ctx.socket.user.toString())
    ) {
      ctx.res = SealText
      return null
    }

    return next()
  }
}
