import config from '../../config/server'
import { KoaContext } from '../../types/koa'

/**
 * Intercept non-administrator user requests for interfaces that require administrator privileges
 */
export default function isAdmin() {
  /**
   * Interfaces that require administrator rights
   */
  const adminEvent = {
    sealUser: true,
    getSealList: true,
    resetUserPassword: true,
    setUserTag: true,
    deleteMessage: true
  }
  return async (ctx: KoaContext, next: Function) => {
    if (adminEvent[ctx.event] && ctx.socket.user.toString() !== config.administrator) {
      ctx.res = 'You are not an administrator'
      return
    }
    await next()
  }
}
