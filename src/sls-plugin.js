const { init, up, down, prepare, history: getHistory } = require('./command-handlers')
const commands = require('./config/commands')
const utils = require('./utils')

class ServerlessDynamoMigrations {
  static utils = utils
  constructor(serverless, options) {
    this.serverless = serverless
    this.provider = serverless.getProvider('aws')
    this.log = message => serverless.cli.log.bind(serverless.cli)(`Migrations - ${message}`)
    this.options = options
    this.commands = commands

    // A region environment variable is required for aws sdk
    const region = this.serverless.configurationInput.provider.region || process.env.AWS_REGION || 'us-east-1'
    process.env.AWS_REGION = region
    this.hooks = {
      'after:deploy:deploy': this.up.bind(this),
      'migration:init:init': this.init.bind(this),
      'migration:prepare:prepare': this.prepare.bind(this),
      'migration:up:migrate': this.up.bind(this),
      'migration:down:rollback': this.rollback.bind(this),
      'migration:history:history': this.getHistory.bind(this),
    }
  }

  async init() {
    const getTableNames = (resources) => { // TODO: Move this function to a more appropriate place
      return Object.values(resources).filter((rValue) => {
        return rValue.Type === 'AWS::DynamoDB::Table'
      }).map((rValue) => {
        return rValue.Properties.TableName
      })
    }

    const resources = this.provider.serverless.service.resources.Resources
    const tableNames = getTableNames(resources)

    return init({ tableNames }).then(() => {
      console.info('"init" command ran successfully.');
    }).catch((error) => {
      console.error(error, 'An error has occured while running migration (init).')
    })
  }

  async prepare() {
    return prepare(this.options).then(() => {
      console.info('"prepare" command ran successfully.');
    }).catch((error) => {
      console.error(error, 'An error has occured while preparing data for migration.')
    })
  }

  async up() {
    return up(this.options).then(() => {
      console.info('"up" command ran successfully.');
    }).catch((error) => {
      console.error(error, 'An error has occured while running migration (up).')
    })

  }

  async rollback() {
    return down(this.options).then(() => {
      console.info('"down" command run successfully.');
    }).catch((error) => {
      console.error(error, 'An error has occured while running migration (down).')
    })
  }

  async getHistory() {
    return getHistory(this.options).then(() => {
      console.info('"down" command run successfully.');
    }).catch((error) => {
      console.error(error, 'An error has occured while running migration (down).')
    })
  }

}

module.exports = ServerlessDynamoMigrations;