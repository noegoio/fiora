import { Context } from 'koa'

/**
 * Enhance the context object
 * Return the data of ctx.res to the client through the socket's acknowledge callback method
 */
export default function enhanceContext() {
  return async (ctx: Context, next: Function) => {
    await next()
    if (ctx.acknowledge) {
      ctx.acknowledge(ctx.res)
    }
  }
}
