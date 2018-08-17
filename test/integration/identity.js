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

  describe('between two dirs', () => {
    context('both remote', () => {
      beforeEach(async () => {
        await cozy.files.createDirectoryByPath('/alfred')
        await helpers.pullAndSyncAll()

        await cozy.files.createDirectoryByPath('/Alfred')
        await helpers.pullAndSyncAll()
      })

      itWorksAsExpected()
    })

    describe('unsynced local + remote', () => {
      beforeEach(async () => {
        await helpers.local.syncDir.ensureDir('alfred')
        await helpers.local.scan()
        await cozy.files.createDirectoryByPath('/Alfred')
        await helpers.pullAndSyncAll()
      })

      itWorksAsExpected()
    })

    describe('unsynced remote + local', () => {
      beforeEach(async () => {
        await cozy.files.createDirectoryByPath('/Alfred')
        await helpers.remote.pullChanges()
        await helpers.local.syncDir.ensureDir('alfred')
        await helpers.local.scan()
        await helpers.syncAll()
      })

      itWorksAsExpected()
    })

    function itWorksAsExpected () {
      onPlatforms('win32', 'darwin', () => {
        it('resolves the conflict and syncs everything', async () => {
          should({
            local: await helpers.local.tree(),
            remote: await helpers.remote.tree()
          }).deepEqual({
            local: [
              'alfred/'
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
            local: await helpers.local.tree(),
            remote: await helpers.remote.tree()
          }).deepEqual({
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

          // Local <-> Remote relationships are not messed up
          await cozy.files.updateAttributesByPath('/alfred', {name: 'john'})
          await helpers.pullAndSyncAll()
          should({
            local: await helpers.local.tree(),
            remote: await helpers.remote.tree()
          }).deepEqual({
            local: [
              'Alfred-conflict-.../',
              'john/'
            ],
            remote: [
              '.cozy_trash/',
              'Alfred-conflict-.../',
              'john/'
            ]
          })
        })
      })
    }
  })

  describe('between two files', () => {
    context('both remote', () => {
      beforeEach(async () => {
        await cozy.files.create('alfred content', {name: 'alfred'})
        await helpers.pullAndSyncAll()

        await cozy.files.create('Alfred content', {name: 'Alfred'})
        await helpers.pullAndSyncAll()
      })

      itWorksAsExpected()
    })

    describe('unsynced local + remote', () => {
      beforeEach(async () => {
        await helpers.local.syncDir.outputFile('alfred', 'alfred content')
        await helpers.local.scan()
        await cozy.files.create('Alfred content', {name: 'Alfred'})
        await helpers.pullAndSyncAll()
      })

      itWorksAsExpected()
    })

    describe('unsynced remote + local', () => {
      beforeEach(async () => {
        await cozy.files.create('Alfred content', {name: 'Alfred'})
        await helpers.remote.pullChanges()
        await helpers.local.syncDir.outputFile('alfred', 'alfred content')
        await helpers.local.scan()
        await helpers.syncAll()
      })

      itWorksAsExpected()
    })

    function itWorksAsExpected () {
      onPlatforms('win32', 'darwin', () => {
        it('resolves the conflict and syncs everything', async () => {
          should({
            local: await helpers.local.tree(),
            remote: await helpers.remote.tree()
          }).deepEqual({
            local: [
              'alfred'
            ],
            remote: [
              '.cozy_trash/',
              'Alfred-conflict-...',
              'alfred'
            ]
          })

          // Sync lands on its feet on next remote polling
          await helpers.pullAndSyncAll()
          should({
            local: await helpers.local.tree(),
            remote: await helpers.remote.tree()
          }).deepEqual({
            local: [
              'alfred',
              'Alfred-conflict-...'
            ],
            remote: [
              '.cozy_trash/',
              'Alfred-conflict-...',
              'alfred'
            ]
          })

          // Local <-> Remote relationships are not messed up
          await cozy.files.updateAttributesByPath('/alfred', {name: 'john'})
          await helpers.pullAndSyncAll()
          should({
            local: await helpers.local.tree(),
            remote: await helpers.remote.tree()
          }).deepEqual({
            local: [
              'Alfred-conflict-...',
              'john'
            ],
            remote: [
              '.cozy_trash/',
              'Alfred-conflict-...',
              'john'
            ]
          })
        })
      })
    }
  })
})
