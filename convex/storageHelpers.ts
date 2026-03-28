import { v } from 'convex/values'
import { internalQuery } from './_generated/server'

export const urlForStorage = internalQuery({
  args: { storageId: v.id('_storage') },
  handler: async (ctx, { storageId }) => {
    return await ctx.storage.getUrl(storageId)
  },
})
