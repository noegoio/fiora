import { Context } from 'koa'
import { KoaRoutes } from '../../types/koa'

function noop() {}

/**
 * Route processing
 * @param io koa socket io instance
 * @param _io socket.io
 * @param routes routing
 */
export default function route(io, _io, routes: KoaRoutes) {
  // Register event, otherwise the interface will not go through all middleware
  Object.keys(routes).forEach(routeName => {
    io.on(routeName, noop)
  })

  return async (ctx: Context) => {
    if (routes[ctx.event]) {
      const { event, data, socket } = ctx
      ctx.res = await routes[ctx.event]({
        event, // event name
        data, // request data
        socket, // user socket instance
        io, // koa-socket instance
        _io // socket.io instance
      })
    }
  }
}
