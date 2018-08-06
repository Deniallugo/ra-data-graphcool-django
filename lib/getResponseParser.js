'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _defineProperty2 = require('babel-runtime/helpers/defineProperty');

var _defineProperty3 = _interopRequireDefault(_defineProperty2);

var _extends6 = require('babel-runtime/helpers/extends');

var _extends7 = _interopRequireDefault(_extends6);

var _graphql = require('graphql');

var _reactAdmin = require('react-admin');

var _getFinalType = require('./getFinalType');

var _getFinalType2 = _interopRequireDefault(_getFinalType);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var sanitizeResource = function sanitizeResource(introspectionResults, resource) {
    return function (data) {
        data = data.node
        var result = Object.keys(data).reduce(function (acc, key) {
            if (key.startsWith('_')) {
                return acc;
            }

            var field = resource.type.fields.find(function (f) {
                return f.name === key;
            });
            var type = (0, _getFinalType2.default)(field.type);

            if (type.kind !== _graphql.TypeKind.OBJECT) {
                return (0, _extends7.default)({}, acc, (0, _defineProperty3.default)({}, field.name, data[field.name]));
            }

            // FIXME: We might have to handle linked types which are not resources but will have to be careful about
            // endless circular dependencies
            var linkedResource = introspectionResults.resources.find(function (r) {
                return r.type.name === type.name;
            });

            if (linkedResource) {
                var _extends4;

                var linkedResourceData = data[field.name];

                if (Array.isArray(linkedResourceData)) {
                    var _extends3;

                    return (0, _extends7.default)({}, acc, (_extends3 = {}, (0, _defineProperty3.default)(_extends3, field.name, data[field.name].map(sanitizeResource(introspectionResults, linkedResource))), (0, _defineProperty3.default)(_extends3, field.name + 'Ids', data[field.name].map(function (d) {
                        return d.id;
                    })), _extends3));
                }

                return (0, _extends7.default)({}, acc, (_extends4 = {}, (0, _defineProperty3.default)(_extends4, field.name + '.id', linkedResourceData ? data[field.name].id : undefined), (0, _defineProperty3.default)(_extends4, field.name, linkedResourceData ? sanitizeResource(introspectionResults, linkedResource)(data[field.name]) : undefined), _extends4));
            }

            return (0, _extends7.default)({}, acc, (0, _defineProperty3.default)({}, field.name, data[field.name]));
        }, {});

        return result;
    };
};

exports.default = function (introspectionResults) {
    return function (aorFetchType, resource) {
        return function (response) {
            var sanitize = sanitizeResource(introspectionResults, resource);
            var data = response.data;

            if (aorFetchType === _reactAdmin.GET_LIST || aorFetchType === _reactAdmin.GET_MANY || aorFetchType === _reactAdmin.GET_MANY_REFERENCE) {
                
                var test =  {
                    data: response.data.items.edges.map(sanitize),
                    total: response.data.items.totalCount
                };
                return test
            }

            return { data: sanitize(data.data) };
        };
    };
};

module.exports = exports['default'];