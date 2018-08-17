/* eslint-env mocha */
/* @flow */

const should = require('should')

const configHelpers = require('../support/helpers/config')
const cozyHelpers = require('../support/helpers/cozy')
const { onPlatforms } = require('../support/helpers/platform')
const pouchHelpers = require('../support/helpers/pouch')
const { IntegrationTestHelpers } = require('../support/helpers/integration')

describe('Identity conflict', () => {
  let cozy, helpers

  before(configHelpers.createConfig)
  before(configHelpers.registerClient)
  beforeEach(pouchHelpers.createDatabase)
  beforeEach(cozyHelpers.deleteAll)

  afterEach(() => helpers.local.clean())
  afterEach(pouchHelpers.cleanDatabase)
  after(configHelpers.cleanConfig)

  beforeEach(async function () {
    cozy = cozyHelpers.cozy
    helpers = new IntegrationTestHelpers(this.config, this.pouch, cozy)

    await helpers.local.setupTrash()
    await helpers.remote.ignorePreviousChanges()
  })

  context('with two remote dirs that cannot coexist locally', () => {
    beforeEach(async () => {
      await cozy.files.createDirectoryByPath('/alfred')
      await helpers.pullAndSyncAll()

      await cozy.files.createDirectoryByPath('/Alfred')
      await helpers.pullAndSyncAll()
    })

    onPlatforms('win32', 'darwin', () => {
      it('syncs the first one and resolves the conflict on the second one', async () => {
        should({
          incompatible: await helpers.incompatibleTree(),
          local: await helpers.local.tree(),
          remote: await helpers.remote.tree()
        }).deepEqual({
          incompatible: [
            // Empty since none of them is incompatible by itself
          ],
          local: [
            'alfred/' // First one was synced
          ],
          remote: [
            '.cozy_trash/',
            'Alfred-conflict-.../',
            'alfred/'
          ]
        })

        // Sync lands on its feet on next remote polling
        await helpers.pullAndSyncAll()
        should({
          incompatible: await helpers.incompatibleTree(),
          local: await helpers.local.tree(),
          remote: await helpers.remote.tree()
        }).deepEqual({
          incompatible: [],
          local: [
            'Alfred-conflict-.../',
            'alfred/'
          ],
          remote: [
            '.cozy_trash/',
            'Alfred-conflict-.../',
            'alfred/'
          ]
        })
      })
    })
  })

  describe('unsynced local dir + remote dir', () => {
    beforeEach(async () => {
      await helpers.local.syncDir.ensureDir('alfred')
      await helpers.local.scan()
      await cozy.files.createDirectoryByPath('/Alfred')
      await helpers.pullAndSyncAll()
    })

    onPlatforms('win32', 'darwin', () => {
      it('renames the remote one', async () => {
        should({
          local: await helpers.local.tree(),
          remote: await helpers.remote.tree()
        }).deepEqual({
          local: [
            'alfred/'
          ],
          remote: [
            '.cozy_trash/',
            'Alfred-conflict-.../', // Remote one was renamed
            'alfred/' // Local one was synced remotely
          ]
        })

        // Sync lands on its feet on next remote polling
        await helpers.pullAndSyncAll()
        should({
          incompatible: await helpers.incompatibleTree(),
          local: await helpers.local.tree(),
          remote: await helpers.remote.tree()
        }).deepEqual({
          incompatible: [],
          local: [
            'Alfred-conflict-.../',
            'alfred/'
          ],
          remote: [
            '.cozy_trash/',
            'Alfred-conflict-.../',
            'alfred/'
          ]
        })
      })
    })
  })

  describe('unsynced remote dir + local dir', () => {
    beforeEach(async () => {
      await cozy.files.createDirectoryByPath('/Alfred')
      await helpers.remote.pullChanges()
      await helpers.local.syncDir.ensureDir('alfred')
      await helpers.local.scan()
      await helpers.syncAll()
    })

    onPlatforms('win32', 'darwin', () => {
      it('resolves the conflict on the remote dir, syncs the local one, then syncs the (renamed) remote one', async () => {
        should({
          local: await helpers.local.tree(),
          remote: await helpers.remote.tree()
        }).deepEqual({
          local: [
            'alfred/'
          ],
          remote: [
            '.cozy_trash/',
            'Alfred-conflict-.../', // Remote one was renamed
            'alfred/' // Local one was synced remotely
          ]
        })

        // Sync lands on its feet on next remote polling
        await helpers.pullAndSyncAll()
        should({
          incompatible: await helpers.incompatibleTree(),
          local: await helpers.local.tree(),
          remote: await helpers.remote.tree()
        }).deepEqual({
          incompatible: [],
          local: [
            'Alfred-conflict-.../',
            'alfred/'
          ],
          remote: [
            '.cozy_trash/',
            'Alfred-conflict-.../',
            'alfred/'
          ]
        })
      })
    })
  })

  describe.skip('remote resolution', () => {
    beforeEach(async () => {
      await cozy.files.createDirectoryByPath('/alfred')
      await helpers.pullAndSyncAll()

      await cozy.files.createDirectoryByPath('/Alfred')
      await helpers.pullAndSyncAll()

      await cozy.files.updateAttributesByPath('/Alfred', {name: 'john'})
      await helpers.pullAndSyncAll()
    })

    onPlatforms('win32', 'darwin', () => {
      it('works', async () => {
        should({
          incompatible: await helpers.incompatibleTree(),
          local: await helpers.local.tree(),
          remote: await helpers.remote.tree()
        }).deepEqual({
          idConflicts: [],
          incompatible: [],
          local: [
            'alfred/',
            'john/'
          ],
          remote: [
            '.cozy_trash/',
            'alfred/',
            'john/'
          ]
        })
      })
    })
  })

  describe.skip('local resolution', () => {
    // TODO
  })
})
