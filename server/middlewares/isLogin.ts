import { KoaContext } from '../../types/koa'

/**
 * Interfaces that require login status to intercept unlogged user requests
 */
export default function isLogin() {
  const noUseLoginEvent = {
    register: true,
    login: true,
    loginByToken: true,
    guest: true,
    getDefalutGroupHistoryMessages: true,
    getDefaultGroupOnlineMembers: true,
    getBaiduToken: true
  }
  return async (ctx: KoaContext, next: Function) => {
    if (!noUseLoginEvent[ctx.event] && !ctx.socket.user) {
      ctx.res = 'Please log in and try again'
      return
    }
    await next()
  }
}
