'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _toConsumableArray2 = require('babel-runtime/helpers/toConsumableArray');

var _toConsumableArray3 = _interopRequireDefault(_toConsumableArray2);

var _extends2 = require('babel-runtime/helpers/extends');

var _extends3 = _interopRequireDefault(_extends2);

var _objectWithoutProperties2 = require('babel-runtime/helpers/objectWithoutProperties');

var _objectWithoutProperties3 = _interopRequireDefault(_objectWithoutProperties2);

var _merge = require('lodash/merge');

var _merge2 = _interopRequireDefault(_merge);

var _raDataGraphql = require('ra-data-graphql');

var _raDataGraphql2 = _interopRequireDefault(_raDataGraphql);

var _reactAdmin = require('react-admin');

var _buildQuery = require('./buildQuery');

var _buildQuery2 = _interopRequireDefault(_buildQuery);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var defaultOptions = {
    buildQuery: _buildQuery2.default
};

exports.default = function (options) {
    return (0, _raDataGraphql2.default)((0, _merge2.default)({}, defaultOptions, options)).then(function (defaultDataProvider) {
        return function (fetchType, resource, params) {
            // Graphcool does not support multiple deletions so instead we send multiple DELETE requests
            // This can be optimized using the apollo-link-batch-http link
            if (fetchType === _reactAdmin.DELETE_MANY) {
                var ids = params.ids,
                    otherParams = (0, _objectWithoutProperties3.default)(params, ['ids']);

                return Promise.all(params.ids.map(function (id) {
                    return defaultDataProvider(_reactAdmin.DELETE, resource, (0, _extends3.default)({
                        id: id
                    }, otherParams));
                })).then(function (results) {
                    var data = results.reduce(function (acc, _ref) {
                        var data = _ref.data;
                        return [].concat((0, _toConsumableArray3.default)(acc), [data.id]);
                    }, []);

                    return { data: data };
                });
            }
            // Graphcool does not support multiple deletions so instead we send multiple UPDATE requests
            // This can be optimized using the apollo-link-batch-http link
            if (fetchType === _reactAdmin.UPDATE_MANY) {
                var _ids = params.ids,
                    _otherParams = (0, _objectWithoutProperties3.default)(params, ['ids']);

                return Promise.all(params.ids.map(function (id) {
                    return defaultDataProvider(_reactAdmin.UPDATE, resource, (0, _extends3.default)({
                        id: id
                    }, _otherParams));
                })).then(function (results) {
                    var data = results.reduce(function (acc, _ref2) {
                        var data = _ref2.data;
                        return [].concat((0, _toConsumableArray3.default)(acc), [data.id]);
                    }, []);

                    return { data: data };
                });
            }

            return defaultDataProvider(fetchType, resource, params);
        };
    });
};

module.exports = exports['default'];