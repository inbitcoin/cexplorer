var mongoose = require('mongoose')
var async = require('async')
var path = require('path')
var fs = require('fs')

var casimir = global.casimir
var server = casimir.server
var db = casimir.db
var properties = casimir.properties
var logger = casimir.logger

properties.scanner.scan = process.env.SCAN || (properties.scanner && properties.scanner.scan)
properties.scanner.mempool = process.env.MEMPOOL || (properties.scanner && properties.scanner.mempool)
properties.scanner.mempool_only = process.env.MEMPOOLONLY || (properties.scanner && properties.scanner.mempool_only)
properties.sockets.all_channels = process.env.ALLCHANNELS || properties.sockets.all_channels

properties.db.host = process.env.DB_HOST || properties.db.host
properties.db.port = process.env.DB_PORT || properties.db.port

properties.scanner.start_block = parseInt(properties.scanner.start_block || '0')
properties.scanner.skip_missing_txid = properties.scanner.skip_missing_txid === 'true'
properties.retry_missing_txid = parseInt(properties.retry_missing_txid || 2)
properties.scanner.scanner_enabled = properties.scanner.scanner_enabled || 'true'
properties.scanner.fixer_enabled = properties.scanner.fixer_enabled || 'true'
properties.scanner.ccparser_enabled = properties.scanner.ccparser_enabled || 'true'
properties.scanner.colored_filter = properties.scanner.colored_filter || 'true'
properties.scanner.max_block_to_get = parseInt(properties.scanner.max_block_to_get) || 500
if (properties.scanner.scanner_enabled !== 'true') logger.info('SCANNER disabled')
if (properties.scanner.fixer_enabled !== 'true') logger.info('FIXER disabled')
if (properties.scanner.ccparser_enabled !== 'true') logger.info('CC_PARSER disabled')

var Sockets = require('./app/modules/sockets.js')
var Scanner = require('cc-block-parser-inbitcoin')
var scanner

process.on('message', function(msg) {
  if (msg.last_block) {
    properties.last_block = msg.last_block
  }
  if (scanner && process.env.ROLE === properties.roles.API) {
    if (msg.newblock) {
      scanner.emit('newblock', msg.newblock)
    }
    if (msg.newtransaction) {
      scanner.emit('newtransaction', msg.newtransaction)
    }
    if (msg.newcctransaction) {
      scanner.emit('newcctransaction', msg.newcctransaction)
    }
    if (msg.revertedblock) {
      scanner.emit('revertedblock', msg.revertedblock)
    }
    if (msg.revertedtransaction) {
      scanner.emit('revertedtransaction', msg.revertedtransaction)
    }
    if (msg.revertedcctransaction) {
      scanner.emit('revertedcctransaction', msg.revertedcctransaction)
    }
    if (msg.mempool) {
      global.mempool = true
    }
  }
  if (scanner && process.env.ROLE === properties.roles.SCANNER) {
    if (msg.parse_priority) {
      console.log('priority_parse scanner got request ' + msg.parse_priority)
      scanner.priority_parse(msg.parse_priority, function(err) {
        console.time('priority_parse scanner_to_parent ' + msg.parse_priority)
        process.send({
          to: properties.roles.API,
          priority_parsed: msg.parse_priority,
          err: err
        })
        console.timeEnd('priority_parse scanner_to_parent ' + msg.parse_priority)
      })
    }
  }
})

function getApiVersions() {
  var versionFolders = []
  var routesPath = path.join(__dirname, '/routes')
  var files = fs.readdirSync(routesPath)
  files.forEach(function(file_name) {
    var file_path = path.join(routesPath, file_name)
    if (
      fs.lstatSync(file_path).isDirectory() &&
      file_name[0] === 'v' &&
      !isNaN(file_name.substring(1, file_name.length))
    ) {
      versionFolders.push(file_name)
    }
  })
  return versionFolders
}

async.waterfall(
  [
    function(callback) {
      db.init(properties.db, mongoose, callback)
    },
    function(mongoose, callback) {
      if (process.env.ROLE === properties.roles.API) {
        global.mempool = false
        server.http_server.listen(server.port, function() {
          logger.info('server started on port ' + server.port)
          callback(null, server.http_server)
        })
      } else {
        callback(null, null)
      }
    },
    function(app, callback) {
      var settings = {
        properties: properties,
        debug: properties.debug,
        next_hash: properties.next_hash,
        last_hash: properties.last_hash,
        last_block: properties.last_block,
        last_fully_parsed_block: properties.last_fully_parsed_block,
        rpc_settings: {
          host: process.env.BITCOINNETWORK || properties.bitcoin_rpc.url,
          port: process.env.BITCOINPORT || properties.bitcoin_rpc.port,
          user: process.env.RPCUSERNAME || properties.bitcoin_rpc.username,
          pass: process.env.RPCPASSWORD || properties.bitcoin_rpc.password,
          path: process.env.BITCOINPATH || properties.bitcoin_rpc.path || '',
          timeout: parseInt(process.env.BITCOINTIMEOUT || properties.bitcoin_rpc.timeout, 10)
        }
      }
      casimir.scanner = scanner = new Scanner(settings, mongoose)
      callback()
    },
    function(callback) {
      var opts = {
        io: casimir.server.io_server,
        api_versions: getApiVersions(),
        scanner: scanner
      }
      casimir.sockets = new Sockets(opts)
      if (properties.scanner.scan === 'true' && properties.scanner.mempool_only !== 'true') {
        if (process.env.ROLE === properties.roles.SCANNER && properties.scanner.scanner_enabled === 'true')
          scanner.scan_blocks()
        if (process.env.ROLE === properties.roles.FIXER && properties.scanner.fixer_enabled === 'true')
          scanner.fix_blocks()
        if (process.env.ROLE === properties.roles.CC_PARSER && properties.scanner.ccparser_enabled === 'true')
          scanner.parse_cc()
      }
      if (properties.scanner.mempool_only === 'true') {
        if (process.env.ROLE === properties.roles.SCANNER) scanner.scan_mempol_only()
      }
      callback(null, process.env.ROLE)
    }
  ],
  function(err, result) {
    if (err) {
      logger.info('Critical Error so killing server - ' + err)
      casimir.running = false
      return process.exit(1)
    }
    casimir.running = true
    logger.info('Finished Loading the Server, Last function passed - ' + result)
  }
)
