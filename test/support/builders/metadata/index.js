/* @flow */

const ChangedMetadataBuilder = require('./changed')
const DirMetadataBuilder = require('./dir')
const FileMetadataBuilder = require('./file')

/*::
import type {
  Metadata
} from '../../../../core/metadata'
import type Pouch from '../../../../core/pouch'
import type BaseMetadataBuilder from './base'
*/

module.exports = class MetadataBuilders {
  /*::
  pouch: ?Pouch
  */

  constructor (pouch /*: ?Pouch */) {
    this.pouch = pouch
  }

  /** Build new metadata from existing ones. */
  changedFrom (old /*: Metadata */) /*: ChangedMetadataBuilder */ {
    return new ChangedMetadataBuilder(this.pouch, old)
  }

  dir () /*: DirMetadataBuilder */ {
    return new DirMetadataBuilder(this.pouch)
  }

  file () /*: FileMetadataBuilder */ {
    return new FileMetadataBuilder(this.pouch)
  }

  whatever () /*: BaseMetadataBuilder */ {
    // FIXME: Find a better way to test both doctypes, possibly combined
    return this.dir()
  }
}
