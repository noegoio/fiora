import { KoaContext } from '../../types/koa'

/**
 * Print request log
 */
export default function log() {
  return async (ctx: KoaContext, next: Function) => {
    if (ctx.event === 'disconnect') {
      return next()
    }

    // Interface name user socketId user id
    console.log(`  <-- ${ctx.event}  ${ctx.socket.id} ${ctx.socket.user ? ctx.socket.user : ''}`)

    const before = Date.now()
    await next()
    const after = Date.now()

    // Interface name time-consuming error message (if it fails)
    console.log(
      `  --> ${ctx.event}  ${after - before}ms ${typeof ctx.res === 'string' ? ctx.res : ''}`
    )

    return null
  }
}
