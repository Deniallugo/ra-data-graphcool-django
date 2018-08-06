'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.encodeMutation = exports.encodeQuery = undefined;

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Encodes a graphql query
var graphqlify = function graphqlify(fields) {
    return encodeOperation('query', fields);
};

// Encodes a graphql query
var encodeQuery = exports.encodeQuery = function encodeQuery(_nameOrFields, _fieldsOrNil) {
    return encodeOperation('query', _nameOrFields, _fieldsOrNil);
};

// Encodes a graphql mutation
var encodeMutation = exports.encodeMutation = function encodeMutation(_nameOrFields, _fieldsOrNil) {
    return encodeOperation('mutation', _nameOrFields, _fieldsOrNil);
};

// default export graphqlify
exports.default = graphqlify;

// Encodes a graphql operation and fragments
// The output is a complete graphql query.
//
//   {a: {fields: {b: 1}}}  => '{a{b}}'
//   'mutation', {a: {fields: {b: 1}}}  => 'mutation{a{b}}'
//

function encodeOperation(type, _nameOrFields, _fieldsOrNil) {
    var name = _nameOrFields;
    var fields = _fieldsOrNil;
    if (!_fieldsOrNil && (typeof _nameOrFields === 'undefined' ? 'undefined' : (0, _typeof3.default)(_nameOrFields)) === 'object') {
        name = null;
        fields = _nameOrFields;
    }

    var parts = [];
    var fieldset = void 0;

    if (name && (fields.params || fields.fields)) {
        fieldset = encodeField(name, fields);
        parts.push(type + ' ' + fieldset);
    } else {
        // stringifying the main query object
        fieldset = encodeFieldset(fields, null);

        if (name) {
            parts.push(type + ' ' + name + fieldset);
        } else {
            parts.push(type + ' ' + fieldset);
        }
    }

    return parts.join(',');
}

// Encodes a group of fields and fragments
// The output is a piece of a graphql query.
//
//   {a: 1, b: true, c: {}} => '{a,b,c}'
//   {a: {fields: {b: 1}}}  => '{a{b}}'
//
function encodeFieldset(fields, fragments) {
    var parts = [];
    if (fields) {
        parts.push(encodeFields(fields));
    }
    if (fragments) {
        fragments.forEach(function (f) {
            return parts.push('...' + f.name);
        });
    }
    return '{' + parts.join(',') + '}';
}

// Encodes a set of fields and nested fields.
// The output is a piece of a graphql query.
//
//   {a: 1, b: true, c: {}} => 'a,b,c'
//   {a: {fields: {b: 1}}}  => 'a{b}'
//
function encodeFields(fields) {
    if (!fields || (typeof fields === 'undefined' ? 'undefined' : (0, _typeof3.default)(fields)) !== 'object') {
        throw new Error('fields cannot be "' + fields + '"');
    }

    var encoded = Object.keys(fields).filter(function (key) {
        return fields.hasOwnProperty(key) && fields[key];
    }).map(function (key) {
        return encodeField(key, fields[key]);
    });

    if (encoded.length === 0) {
        throw new Error('fields cannot be empty');
    }

    return encoded.join(',');
}

// Encode a single field and nested fields.
// The output is a piece of a graphql query.
//
//   ('a', 1)                 => 'a'
//   ('a', {field: 'aa'})     => 'a:aa'
//   ('a', {params: {b: 10}}) => 'a(b:10)'
//   ('a', {fields: {b: 10}}) => 'a{b}'
//
function encodeField(key, val) {
    if ((typeof val === 'undefined' ? 'undefined' : (0, _typeof3.default)(val)) !== 'object') {
        return key;
    }

    var parts = [key];

    if (val.field) {
        parts.push(':' + val.field);
    }
    if (val.params) {
        parts.push(encodeParams(val.params));
    }
    if (val.fields || val.fragments) {
        parts.push(encodeFieldset(val.fields, val.fragments));
    }

    return parts.join('');
}

// Encodes a map of field parameters.
//
//   {a: 1, b: true} => '(a:1,b:true)'
//   {a: ['b', 'c']} => '(a:["b","c"])'
//   {a: {b: 'c'}}   => '(a:{b:"c"})'
//
function encodeParams(params) {
    var encoded = encodeParamsMap(params);
    if (encoded.length === 0) {
        throw new Error('params cannot be empty');
    }

    return '(' + encoded.join(',') + ')';
}

// Encodes an object type field parameter.
//
//   {a: {b: {c: 10}}} => '{a:{b:{c:10}}}'
//   {a: {b: false}}   => '{a:{b:false}}'
//
function encodeParamsObject(params) {
    var encoded = encodeParamsMap(params);
    return '{' + encoded.join(',') + '}';
}

// Encodes an array type field parameter.
//
//   [1, 2, 3]          => '[1,2,3]'
//   [ {a: 1}, {a: 2} ] => '[{a:1},{a:2}]'
//
function encodeParamsArray(array) {
    var encoded = array.map(encodeParamValue);
    return '[' + encoded.join(',') + ']';
}

// Encodes a map of field parameters.
//
//   {a: 1, b: true} => 'a:1,b:true'
//   {a: ['b', 'c']} => 'a:["b","c"]'
//   {a: {b: 'c'}}   => 'a:{b:"c"}'
//
function encodeParamsMap(params) {
    if (!params || (typeof params === 'undefined' ? 'undefined' : (0, _typeof3.default)(params)) !== 'object') {
        throw new Error('params cannot be "' + params + '"');
    }

    var keys = Object.keys(params).filter(function (key) {
        var val = params[key];
        return params.hasOwnProperty(key) && val !== undefined && val !== null && !Number.isNaN(val);
    });

    return keys.map(function (key) {
        return encodeParam(key, params[key]);
    });
}

// Encodes a single parameter
//
//    ('a', 1) => 'a:1'
//
function encodeParam(key, val) {
    return key + ':' + encodeParamValue(val);
}

// Encodes parameter value
//
//   'a'       => '"a"'
//   Enum('a') => 'a'
//
function encodeParamValue(value) {
    if (Array.isArray(value)) {
        return encodeParamsArray(value);
    }
    if ((typeof value === 'undefined' ? 'undefined' : (0, _typeof3.default)(value)) === 'object') {
        return encodeParamsObject(value);
    }
    if (typeof value === 'string') {
        return value;
    }

    throw new Error('unsupported param type "' + (typeof value === 'undefined' ? 'undefined' : (0, _typeof3.default)(value)) + '"');
}