import assert from 'assert'
import { KoaContext } from '../../types/koa'

/**
 * Global exception catch
 * If it is an exception thrown by assert, the exception message is returned to the client
 * If it is other exception, print exception information and return Server Error
 */
export default function catchError() {
  return async (ctx: KoaContext, next: Function) => {
    try {
      await next()
    } catch (err) {
      if (err instanceof assert.AssertionError) {
        ctx.res = err.message
        return
      }
      ctx.res = `Server Error: ${err.message}`
      console.error('Unhandled Error\n', err)
    }
  }
}
