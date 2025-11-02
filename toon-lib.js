//#region src/constants.ts
const LIST_ITEM_MARKER = "-";
const LIST_ITEM_PREFIX = "- ";
const COMMA = ",";
const COLON = ":";
const SPACE = " ";
const PIPE = "|";
const HASH = "#";
const OPEN_BRACKET = "[";
const CLOSE_BRACKET = "]";
const OPEN_BRACE = "{";
const CLOSE_BRACE = "}";
const NULL_LITERAL = "null";
const TRUE_LITERAL = "true";
const FALSE_LITERAL = "false";
const BACKSLASH = "\\";
const DOUBLE_QUOTE = "\"";
const NEWLINE = "\n";
const CARRIAGE_RETURN = "\r";
const TAB = "	";
const DELIMITERS = {
	comma: COMMA,
	tab: TAB,
	pipe: PIPE
};
const DEFAULT_DELIMITER = DELIMITERS.comma;

//#endregion
//#region src/shared/string-utils.ts
/**
* Escapes special characters in a string for encoding.
*
* @remarks
* Handles backslashes, quotes, newlines, carriage returns, and tabs.
*/
function escapeString(value) {
	return value.replace(/\\/g, `${BACKSLASH}${BACKSLASH}`).replace(/"/g, `${BACKSLASH}${DOUBLE_QUOTE}`).replace(/\n/g, `${BACKSLASH}n`).replace(/\r/g, `${BACKSLASH}r`).replace(/\t/g, `${BACKSLASH}t`);
}
/**
* Unescapes a string by processing escape sequences.
*
* @remarks
* Handles `\n`, `\t`, `\r`, `\\`, and `\"` escape sequences.
*/
function unescapeString(value) {
	let result = "";
	let i = 0;
	while (i < value.length) {
		if (value[i] === BACKSLASH) {
			if (i + 1 >= value.length) throw new SyntaxError("Invalid escape sequence: backslash at end of string");
			const next = value[i + 1];
			if (next === "n") {
				result += NEWLINE;
				i += 2;
				continue;
			}
			if (next === "t") {
				result += TAB;
				i += 2;
				continue;
			}
			if (next === "r") {
				result += CARRIAGE_RETURN;
				i += 2;
				continue;
			}
			if (next === BACKSLASH) {
				result += BACKSLASH;
				i += 2;
				continue;
			}
			if (next === DOUBLE_QUOTE) {
				result += DOUBLE_QUOTE;
				i += 2;
				continue;
			}
			throw new SyntaxError(`Invalid escape sequence: \\${next}`);
		}
		result += value[i];
		i++;
	}
	return result;
}
/**
* Finds the index of the closing double quote in a string, accounting for escape sequences.
*
* @param content The string to search in
* @param start The index of the opening quote
* @returns The index of the closing quote, or -1 if not found
*/
function findClosingQuote(content, start) {
	let i = start + 1;
	while (i < content.length) {
		if (content[i] === BACKSLASH && i + 1 < content.length) {
			i += 2;
			continue;
		}
		if (content[i] === DOUBLE_QUOTE) return i;
		i++;
	}
	return -1;
}
/**
* Finds the index of a specific character outside of quoted sections.
*
* @param content The string to search in
* @param char The character to look for
* @param start Optional starting index (defaults to 0)
* @returns The index of the character, or -1 if not found outside quotes
*/
function findUnquotedChar(content, char, start = 0) {
	let inQuotes = false;
	let i = start;
	while (i < content.length) {
		if (content[i] === BACKSLASH && i + 1 < content.length && inQuotes) {
			i += 2;
			continue;
		}
		if (content[i] === DOUBLE_QUOTE) {
			inQuotes = !inQuotes;
			i++;
			continue;
		}
		if (content[i] === char && !inQuotes) return i;
		i++;
	}
	return -1;
}

//#endregion
//#region src/shared/literal-utils.ts
/**
* Checks if a token is a boolean or null literal (`true`, `false`, `null`).
*/
function isBooleanOrNullLiteral(token) {
	return token === TRUE_LITERAL || token === FALSE_LITERAL || token === NULL_LITERAL;
}
/**
* Checks if a token represents a valid numeric literal.
*
* @remarks
* Rejects numbers with leading zeros (except `"0"` itself or decimals like `"0.5"`).
*/
function isNumericLiteral(token) {
	if (!token) return false;
	if (token.length > 1 && token[0] === "0" && token[1] !== ".") return false;
	const num = Number(token);
	return !Number.isNaN(num) && Number.isFinite(num);
}

//#endregion
//#region src/decode/parser.ts
function parseArrayHeaderLine(content, defaultDelimiter) {
	if (content.trimStart().startsWith(DOUBLE_QUOTE)) return;
	const bracketStart = content.indexOf(OPEN_BRACKET);
	if (bracketStart === -1) return;
	const bracketEnd = content.indexOf(CLOSE_BRACKET, bracketStart);
	if (bracketEnd === -1) return;
	let colonIndex = bracketEnd + 1;
	let braceEnd = colonIndex;
	const braceStart = content.indexOf(OPEN_BRACE, bracketEnd);
	if (braceStart !== -1 && braceStart < content.indexOf(COLON, bracketEnd)) {
		const foundBraceEnd = content.indexOf(CLOSE_BRACE, braceStart);
		if (foundBraceEnd !== -1) braceEnd = foundBraceEnd + 1;
	}
	colonIndex = content.indexOf(COLON, Math.max(bracketEnd, braceEnd));
	if (colonIndex === -1) return;
	const key = bracketStart > 0 ? content.slice(0, bracketStart) : void 0;
	const afterColon = content.slice(colonIndex + 1).trim();
	const bracketContent = content.slice(bracketStart + 1, bracketEnd);
	let parsedBracket;
	try {
		parsedBracket = parseBracketSegment(bracketContent, defaultDelimiter);
	} catch {
		return;
	}
	const { length, delimiter, hasLengthMarker } = parsedBracket;
	let fields;
	if (braceStart !== -1 && braceStart < colonIndex) {
		const foundBraceEnd = content.indexOf(CLOSE_BRACE, braceStart);
		if (foundBraceEnd !== -1 && foundBraceEnd < colonIndex) fields = parseDelimitedValues(content.slice(braceStart + 1, foundBraceEnd), delimiter).map((field) => parseStringLiteral(field.trim()));
	}
	return {
		header: {
			key,
			length,
			delimiter,
			fields,
			hasLengthMarker
		},
		inlineValues: afterColon || void 0
	};
}
function parseBracketSegment(seg, defaultDelimiter) {
	let hasLengthMarker = false;
	let content = seg;
	if (content.startsWith(HASH)) {
		hasLengthMarker = true;
		content = content.slice(1);
	}
	let delimiter = defaultDelimiter;
	if (content.endsWith(TAB)) {
		delimiter = DELIMITERS.tab;
		content = content.slice(0, -1);
	} else if (content.endsWith(PIPE)) {
		delimiter = DELIMITERS.pipe;
		content = content.slice(0, -1);
	}
	const length = Number.parseInt(content, 10);
	if (Number.isNaN(length)) throw new TypeError(`Invalid array length: ${seg}`);
	return {
		length,
		delimiter,
		hasLengthMarker
	};
}
function parseDelimitedValues(input, delimiter) {
	const values = [];
	let current = "";
	let inQuotes = false;
	let i = 0;
	while (i < input.length) {
		const char = input[i];
		if (char === BACKSLASH && i + 1 < input.length && inQuotes) {
			current += char + input[i + 1];
			i += 2;
			continue;
		}
		if (char === DOUBLE_QUOTE) {
			inQuotes = !inQuotes;
			current += char;
			i++;
			continue;
		}
		if (char === delimiter && !inQuotes) {
			values.push(current.trim());
			current = "";
			i++;
			continue;
		}
		current += char;
		i++;
	}
	if (current || values.length > 0) values.push(current.trim());
	return values;
}
function mapRowValuesToPrimitives(values) {
	return values.map((v) => parsePrimitiveToken(v));
}
function parsePrimitiveToken(token) {
	const trimmed = token.trim();
	if (!trimmed) return "";
	if (trimmed.startsWith(DOUBLE_QUOTE)) return parseStringLiteral(trimmed);
	if (isBooleanOrNullLiteral(trimmed)) {
		if (trimmed === TRUE_LITERAL) return true;
		if (trimmed === FALSE_LITERAL) return false;
		if (trimmed === NULL_LITERAL) return null;
	}
	if (isNumericLiteral(trimmed)) return Number.parseFloat(trimmed);
	return trimmed;
}
function parseStringLiteral(token) {
	const trimmed = token.trim();
	if (trimmed.startsWith(DOUBLE_QUOTE)) {
		const closingQuoteIndex = findClosingQuote(trimmed, 0);
		if (closingQuoteIndex === -1) throw new SyntaxError("Unterminated string: missing closing quote");
		if (closingQuoteIndex !== trimmed.length - 1) throw new SyntaxError("Unexpected characters after closing quote");
		return unescapeString(trimmed.slice(1, closingQuoteIndex));
	}
	return trimmed;
}
function parseUnquotedKey(content, start) {
	let end = start;
	while (end < content.length && content[end] !== COLON) end++;
	if (end >= content.length || content[end] !== COLON) throw new SyntaxError("Missing colon after key");
	const key = content.slice(start, end).trim();
	end++;
	return {
		key,
		end
	};
}
function parseQuotedKey(content, start) {
	const closingQuoteIndex = findClosingQuote(content, start);
	if (closingQuoteIndex === -1) throw new SyntaxError("Unterminated quoted key");
	const key = unescapeString(content.slice(start + 1, closingQuoteIndex));
	let end = closingQuoteIndex + 1;
	if (end >= content.length || content[end] !== COLON) throw new SyntaxError("Missing colon after key");
	end++;
	return {
		key,
		end
	};
}
function parseKeyToken(content, start) {
	if (content[start] === DOUBLE_QUOTE) return parseQuotedKey(content, start);
	else return parseUnquotedKey(content, start);
}
function isArrayHeaderAfterHyphen(content) {
	return content.trim().startsWith(OPEN_BRACKET) && findUnquotedChar(content, COLON) !== -1;
}
function isObjectFirstFieldAfterHyphen(content) {
	return findUnquotedChar(content, COLON) !== -1;
}

//#endregion
//#region src/decode/validation.ts
/**
* Asserts that the actual count matches the expected count in strict mode.
*
* @param actual The actual count
* @param expected The expected count
* @param itemType The type of items being counted (e.g., `list array items`, `tabular rows`)
* @param options Decode options
* @throws RangeError if counts don't match in strict mode
*/
function assertExpectedCount(actual, expected, itemType, options) {
	if (options.strict && actual !== expected) throw new RangeError(`Expected ${expected} ${itemType}, but got ${actual}`);
}
/**
* Validates that there are no extra list items beyond the expected count.
*
* @param cursor The line cursor
* @param itemDepth The expected depth of items
* @param expectedCount The expected number of items
* @throws RangeError if extra items are found
*/
function validateNoExtraListItems(cursor, itemDepth, expectedCount) {
	if (cursor.atEnd()) return;
	const nextLine = cursor.peek();
	if (nextLine && nextLine.depth === itemDepth && nextLine.content.startsWith(LIST_ITEM_PREFIX)) throw new RangeError(`Expected ${expectedCount} list array items, but found more`);
}
/**
* Validates that there are no extra tabular rows beyond the expected count.
*
* @param cursor The line cursor
* @param rowDepth The expected depth of rows
* @param header The array header info containing length and delimiter
* @throws RangeError if extra rows are found
*/
function validateNoExtraTabularRows(cursor, rowDepth, header) {
	if (cursor.atEnd()) return;
	const nextLine = cursor.peek();
	if (nextLine && nextLine.depth === rowDepth && !nextLine.content.startsWith(LIST_ITEM_PREFIX) && isDataRow(nextLine.content, header.delimiter)) throw new RangeError(`Expected ${header.length} tabular rows, but found more`);
}
/**
* Validates that there are no blank lines within a specific line range and depth.
*
* @remarks
* In strict mode, blank lines inside arrays/tabular rows are not allowed.
*
* @param startLine The starting line number (inclusive)
* @param endLine The ending line number (inclusive)
* @param blankLines Array of blank line information
* @param strict Whether strict mode is enabled
* @param context Description of the context (e.g., "list array", "tabular array")
* @throws SyntaxError if blank lines are found in strict mode
*/
function validateNoBlankLinesInRange(startLine, endLine, blankLines, strict, context) {
	if (!strict) return;
	const blanksInRange = blankLines.filter((blank) => blank.lineNumber > startLine && blank.lineNumber < endLine);
	if (blanksInRange.length > 0) throw new SyntaxError(`Line ${blanksInRange[0].lineNumber}: Blank lines inside ${context} are not allowed in strict mode`);
}
/**
* Checks if a line represents a data row (as opposed to a key-value pair) in a tabular array.
*
* @param content The line content
* @param delimiter The delimiter used in the table
* @returns true if the line is a data row, false if it's a key-value pair
*/
function isDataRow(content, delimiter) {
	const colonPos = content.indexOf(COLON);
	const delimiterPos = content.indexOf(delimiter);
	if (colonPos === -1) return true;
	if (delimiterPos !== -1 && delimiterPos < colonPos) return true;
	return false;
}

//#endregion
//#region src/decode/decoders.ts
function decodeValueFromLines(cursor, options) {
	const first = cursor.peek();
	if (!first) throw new ReferenceError("No content to decode");
	if (isArrayHeaderAfterHyphen(first.content)) {
		const headerInfo = parseArrayHeaderLine(first.content, DEFAULT_DELIMITER);
		if (headerInfo) {
			cursor.advance();
			return decodeArrayFromHeader(headerInfo.header, headerInfo.inlineValues, cursor, 0, options);
		}
	}
	if (cursor.length === 1 && !isKeyValueLine(first)) return parsePrimitiveToken(first.content.trim());
	return decodeObject(cursor, 0, options);
}
function isKeyValueLine(line) {
	const content = line.content;
	if (content.startsWith("\"")) {
		const closingQuoteIndex = findClosingQuote(content, 0);
		if (closingQuoteIndex === -1) return false;
		return closingQuoteIndex + 1 < content.length && content[closingQuoteIndex + 1] === COLON;
	} else return content.includes(COLON);
}
function decodeObject(cursor, baseDepth, options) {
	const obj = {};
	while (!cursor.atEnd()) {
		const line = cursor.peek();
		if (!line || line.depth < baseDepth) break;
		if (line.depth === baseDepth) {
			const [key, value] = decodeKeyValuePair(line, cursor, baseDepth, options);
			obj[key] = value;
		} else break;
	}
	return obj;
}
function decodeKeyValue(content, cursor, baseDepth, options) {
	const arrayHeader = parseArrayHeaderLine(content, DEFAULT_DELIMITER);
	if (arrayHeader && arrayHeader.header.key) {
		const value = decodeArrayFromHeader(arrayHeader.header, arrayHeader.inlineValues, cursor, baseDepth, options);
		return {
			key: arrayHeader.header.key,
			value,
			followDepth: baseDepth + 1
		};
	}
	const { key, end } = parseKeyToken(content, 0);
	const rest = content.slice(end).trim();
	if (!rest) {
		const nextLine = cursor.peek();
		if (nextLine && nextLine.depth > baseDepth) return {
			key,
			value: decodeObject(cursor, baseDepth + 1, options),
			followDepth: baseDepth + 1
		};
		return {
			key,
			value: {},
			followDepth: baseDepth + 1
		};
	}
	return {
		key,
		value: parsePrimitiveToken(rest),
		followDepth: baseDepth + 1
	};
}
function decodeKeyValuePair(line, cursor, baseDepth, options) {
	cursor.advance();
	const { key, value } = decodeKeyValue(line.content, cursor, baseDepth, options);
	return [key, value];
}
function decodeArrayFromHeader(header, inlineValues, cursor, baseDepth, options) {
	if (inlineValues) return decodeInlinePrimitiveArray(header, inlineValues, options);
	if (header.fields && header.fields.length > 0) return decodeTabularArray(header, cursor, baseDepth, options);
	return decodeListArray(header, cursor, baseDepth, options);
}
function decodeInlinePrimitiveArray(header, inlineValues, options) {
	if (!inlineValues.trim()) {
		assertExpectedCount(0, header.length, "inline array items", options);
		return [];
	}
	const primitives = mapRowValuesToPrimitives(parseDelimitedValues(inlineValues, header.delimiter));
	assertExpectedCount(primitives.length, header.length, "inline array items", options);
	return primitives;
}
function decodeListArray(header, cursor, baseDepth, options) {
	const items = [];
	const itemDepth = baseDepth + 1;
	let startLine;
	let endLine;
	while (!cursor.atEnd() && items.length < header.length) {
		const line = cursor.peek();
		if (!line || line.depth < itemDepth) break;
		if (line.depth === itemDepth && line.content.startsWith(LIST_ITEM_PREFIX)) {
			if (startLine === void 0) startLine = line.lineNumber;
			endLine = line.lineNumber;
			const item = decodeListItem(cursor, itemDepth, header.delimiter, options);
			items.push(item);
			const currentLine = cursor.current();
			if (currentLine) endLine = currentLine.lineNumber;
		} else break;
	}
	assertExpectedCount(items.length, header.length, "list array items", options);
	if (options.strict && startLine !== void 0 && endLine !== void 0) validateNoBlankLinesInRange(startLine, endLine, cursor.getBlankLines(), options.strict, "list array");
	if (options.strict) validateNoExtraListItems(cursor, itemDepth, header.length);
	return items;
}
function decodeTabularArray(header, cursor, baseDepth, options) {
	const objects = [];
	const rowDepth = baseDepth + 1;
	let startLine;
	let endLine;
	while (!cursor.atEnd() && objects.length < header.length) {
		const line = cursor.peek();
		if (!line || line.depth < rowDepth) break;
		if (line.depth === rowDepth) {
			if (startLine === void 0) startLine = line.lineNumber;
			endLine = line.lineNumber;
			cursor.advance();
			const values = parseDelimitedValues(line.content, header.delimiter);
			assertExpectedCount(values.length, header.fields.length, "tabular row values", options);
			const primitives = mapRowValuesToPrimitives(values);
			const obj = {};
			for (let i = 0; i < header.fields.length; i++) obj[header.fields[i]] = primitives[i];
			objects.push(obj);
		} else break;
	}
	assertExpectedCount(objects.length, header.length, "tabular rows", options);
	if (options.strict && startLine !== void 0 && endLine !== void 0) validateNoBlankLinesInRange(startLine, endLine, cursor.getBlankLines(), options.strict, "tabular array");
	if (options.strict) validateNoExtraTabularRows(cursor, rowDepth, header);
	return objects;
}
function decodeListItem(cursor, baseDepth, activeDelimiter, options) {
	const line = cursor.next();
	if (!line) throw new ReferenceError("Expected list item");
	const afterHyphen = line.content.slice(LIST_ITEM_PREFIX.length);
	if (isArrayHeaderAfterHyphen(afterHyphen)) {
		const arrayHeader = parseArrayHeaderLine(afterHyphen, DEFAULT_DELIMITER);
		if (arrayHeader) return decodeArrayFromHeader(arrayHeader.header, arrayHeader.inlineValues, cursor, baseDepth, options);
	}
	if (isObjectFirstFieldAfterHyphen(afterHyphen)) return decodeObjectFromListItem(line, cursor, baseDepth, options);
	return parsePrimitiveToken(afterHyphen);
}
function decodeObjectFromListItem(firstLine, cursor, baseDepth, options) {
	const { key, value, followDepth } = decodeKeyValue(firstLine.content.slice(LIST_ITEM_PREFIX.length), cursor, baseDepth, options);
	const obj = { [key]: value };
	while (!cursor.atEnd()) {
		const line = cursor.peek();
		if (!line || line.depth < followDepth) break;
		if (line.depth === followDepth && !line.content.startsWith(LIST_ITEM_PREFIX)) {
			const [k, v] = decodeKeyValuePair(line, cursor, followDepth, options);
			obj[k] = v;
		} else break;
	}
	return obj;
}

//#endregion
//#region src/decode/scanner.ts
var LineCursor = class {
	lines;
	index;
	blankLines;
	constructor(lines, blankLines = []) {
		this.lines = lines;
		this.index = 0;
		this.blankLines = blankLines;
	}
	getBlankLines() {
		return this.blankLines;
	}
	peek() {
		return this.lines[this.index];
	}
	next() {
		return this.lines[this.index++];
	}
	current() {
		return this.index > 0 ? this.lines[this.index - 1] : void 0;
	}
	advance() {
		this.index++;
	}
	atEnd() {
		return this.index >= this.lines.length;
	}
	get length() {
		return this.lines.length;
	}
	peekAtDepth(targetDepth) {
		const line = this.peek();
		if (!line || line.depth < targetDepth) return;
		if (line.depth === targetDepth) return line;
	}
	hasMoreAtDepth(targetDepth) {
		return this.peekAtDepth(targetDepth) !== void 0;
	}
};
function toParsedLines(source, indentSize, strict) {
	if (!source.trim()) return {
		lines: [],
		blankLines: []
	};
	const lines = source.split("\n");
	const parsed = [];
	const blankLines = [];
	for (let i = 0; i < lines.length; i++) {
		const raw = lines[i];
		const lineNumber = i + 1;
		let indent = 0;
		while (indent < raw.length && raw[indent] === SPACE) indent++;
		const content = raw.slice(indent);
		if (!content.trim()) {
			const depth$1 = computeDepthFromIndent(indent, indentSize);
			blankLines.push({
				lineNumber,
				indent,
				depth: depth$1
			});
			continue;
		}
		const depth = computeDepthFromIndent(indent, indentSize);
		if (strict) {
			let wsEnd = 0;
			while (wsEnd < raw.length && (raw[wsEnd] === SPACE || raw[wsEnd] === TAB)) wsEnd++;
			if (raw.slice(0, wsEnd).includes(TAB)) throw new SyntaxError(`Line ${lineNumber}: Tabs are not allowed in indentation in strict mode`);
			if (indent > 0 && indent % indentSize !== 0) throw new SyntaxError(`Line ${lineNumber}: Indentation must be exact multiple of ${indentSize}, but found ${indent} spaces`);
		}
		parsed.push({
			raw,
			indent,
			content,
			depth,
			lineNumber
		});
	}
	return {
		lines: parsed,
		blankLines
	};
}
function computeDepthFromIndent(indentSpaces, indentSize) {
	return Math.floor(indentSpaces / indentSize);
}

//#endregion
//#region src/encode/normalize.ts
function normalizeValue(value) {
	if (value === null) return null;
	if (typeof value === "string" || typeof value === "boolean") return value;
	if (typeof value === "number") {
		if (Object.is(value, -0)) return 0;
		if (!Number.isFinite(value)) return null;
		return value;
	}
	if (typeof value === "bigint") {
		if (value >= Number.MIN_SAFE_INTEGER && value <= Number.MAX_SAFE_INTEGER) return Number(value);
		return value.toString();
	}
	if (value instanceof Date) return value.toISOString();
	if (Array.isArray(value)) return value.map(normalizeValue);
	if (value instanceof Set) return Array.from(value).map(normalizeValue);
	if (value instanceof Map) return Object.fromEntries(Array.from(value, ([k, v]) => [String(k), normalizeValue(v)]));
	if (isPlainObject(value)) {
		const result = {};
		for (const key in value) if (Object.prototype.hasOwnProperty.call(value, key)) result[key] = normalizeValue(value[key]);
		return result;
	}
	return null;
}
function isJsonPrimitive(value) {
	return value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}
function isJsonArray(value) {
	return Array.isArray(value);
}
function isJsonObject(value) {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}
function isPlainObject(value) {
	if (value === null || typeof value !== "object") return false;
	const prototype = Object.getPrototypeOf(value);
	return prototype === null || prototype === Object.prototype;
}
function isArrayOfPrimitives(value) {
	return value.every((item) => isJsonPrimitive(item));
}
function isArrayOfArrays(value) {
	return value.every((item) => isJsonArray(item));
}
function isArrayOfObjects(value) {
	return value.every((item) => isJsonObject(item));
}

//#endregion
//#region src/shared/validation.ts
/**
* Checks if a key can be used without quotes.
*
* @remarks
* Valid unquoted keys must start with a letter or underscore,
* followed by letters, digits, underscores, or dots.
*/
function isValidUnquotedKey(key) {
	return /^[A-Z_][\w.]*$/i.test(key);
}
/**
* Determines if a string value can be safely encoded without quotes.
*
* @remarks
* A string needs quoting if it:
* - Is empty
* - Has leading or trailing whitespace
* - Could be confused with a literal (boolean, null, number)
* - Contains structural characters (colons, brackets, braces)
* - Contains quotes or backslashes (need escaping)
* - Contains control characters (newlines, tabs, etc.)
* - Contains the active delimiter
* - Starts with a list marker (hyphen)
*/
function isSafeUnquoted(value, delimiter = COMMA) {
	if (!value) return false;
	if (value !== value.trim()) return false;
	if (isBooleanOrNullLiteral(value) || isNumericLike(value)) return false;
	if (value.includes(":")) return false;
	if (value.includes("\"") || value.includes("\\")) return false;
	if (/[[\]{}]/.test(value)) return false;
	if (/[\n\r\t]/.test(value)) return false;
	if (value.includes(delimiter)) return false;
	if (value.startsWith(LIST_ITEM_MARKER)) return false;
	return true;
}
/**
* Checks if a string looks like a number.
*
* @remarks
* Match numbers like `42`, `-3.14`, `1e-6`, `05`, etc.
*/
function isNumericLike(value) {
	return /^-?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(value) || /^0\d+$/.test(value);
}

//#endregion
//#region src/encode/primitives.ts
function encodePrimitive(value, delimiter) {
	if (value === null) return NULL_LITERAL;
	if (typeof value === "boolean") return String(value);
	if (typeof value === "number") return String(value);
	return encodeStringLiteral(value, delimiter);
}
function encodeStringLiteral(value, delimiter = COMMA) {
	if (isSafeUnquoted(value, delimiter)) return value;
	return `${DOUBLE_QUOTE}${escapeString(value)}${DOUBLE_QUOTE}`;
}
function encodeKey(key) {
	if (isValidUnquotedKey(key)) return key;
	return `${DOUBLE_QUOTE}${escapeString(key)}${DOUBLE_QUOTE}`;
}
function encodeAndJoinPrimitives(values, delimiter = COMMA) {
	return values.map((v) => encodePrimitive(v, delimiter)).join(delimiter);
}
function formatHeader(length, options) {
	const key = options?.key;
	const fields = options?.fields;
	const delimiter = options?.delimiter ?? COMMA;
	const lengthMarker = options?.lengthMarker ?? false;
	let header = "";
	if (key) header += encodeKey(key);
	header += `[${lengthMarker || ""}${length}${delimiter !== DEFAULT_DELIMITER ? delimiter : ""}]`;
	if (fields) {
		const quotedFields = fields.map((f) => encodeKey(f));
		header += `{${quotedFields.join(delimiter)}}`;
	}
	header += ":";
	return header;
}

//#endregion
//#region src/encode/writer.ts
var LineWriter = class {
	lines = [];
	indentationString;
	constructor(indentSize) {
		this.indentationString = " ".repeat(indentSize);
	}
	push(depth, content) {
		const indent = this.indentationString.repeat(depth);
		this.lines.push(indent + content);
	}
	pushListItem(depth, content) {
		this.push(depth, `${LIST_ITEM_PREFIX}${content}`);
	}
	toString() {
		return this.lines.join("\n");
	}
};

//#endregion
//#region src/encode/encoders.ts
function encodeValue(value, options) {
	if (isJsonPrimitive(value)) return encodePrimitive(value, options.delimiter);
	const writer = new LineWriter(options.indent);
	if (isJsonArray(value)) encodeArray(void 0, value, writer, 0, options);
	else if (isJsonObject(value)) encodeObject(value, writer, 0, options);
	return writer.toString();
}
function encodeObject(value, writer, depth, options) {
	const keys = Object.keys(value);
	for (const key of keys) encodeKeyValuePair(key, value[key], writer, depth, options);
}
function encodeKeyValuePair(key, value, writer, depth, options) {
	const encodedKey = encodeKey(key);
	if (isJsonPrimitive(value)) writer.push(depth, `${encodedKey}: ${encodePrimitive(value, options.delimiter)}`);
	else if (isJsonArray(value)) encodeArray(key, value, writer, depth, options);
	else if (isJsonObject(value)) if (Object.keys(value).length === 0) writer.push(depth, `${encodedKey}:`);
	else {
		writer.push(depth, `${encodedKey}:`);
		encodeObject(value, writer, depth + 1, options);
	}
}
function encodeArray(key, value, writer, depth, options) {
	if (value.length === 0) {
		const header = formatHeader(0, {
			key,
			delimiter: options.delimiter,
			lengthMarker: options.lengthMarker
		});
		writer.push(depth, header);
		return;
	}
	if (isArrayOfPrimitives(value)) {
		const formatted = encodeInlineArrayLine(value, options.delimiter, key, options.lengthMarker);
		writer.push(depth, formatted);
		return;
	}
	if (isArrayOfArrays(value)) {
		if (value.every((arr) => isArrayOfPrimitives(arr))) {
			encodeArrayOfArraysAsListItems(key, value, writer, depth, options);
			return;
		}
	}
	if (isArrayOfObjects(value)) {
		const header = extractTabularHeader(value);
		if (header) encodeArrayOfObjectsAsTabular(key, value, header, writer, depth, options);
		else encodeMixedArrayAsListItems(key, value, writer, depth, options);
		return;
	}
	encodeMixedArrayAsListItems(key, value, writer, depth, options);
}
function encodeArrayOfArraysAsListItems(prefix, values, writer, depth, options) {
	const header = formatHeader(values.length, {
		key: prefix,
		delimiter: options.delimiter,
		lengthMarker: options.lengthMarker
	});
	writer.push(depth, header);
	for (const arr of values) if (isArrayOfPrimitives(arr)) {
		const inline = encodeInlineArrayLine(arr, options.delimiter, void 0, options.lengthMarker);
		writer.pushListItem(depth + 1, inline);
	}
}
function encodeInlineArrayLine(values, delimiter, prefix, lengthMarker) {
	const header = formatHeader(values.length, {
		key: prefix,
		delimiter,
		lengthMarker
	});
	const joinedValue = encodeAndJoinPrimitives(values, delimiter);
	if (values.length === 0) return header;
	return `${header} ${joinedValue}`;
}
function encodeArrayOfObjectsAsTabular(prefix, rows, header, writer, depth, options) {
	const formattedHeader = formatHeader(rows.length, {
		key: prefix,
		fields: header,
		delimiter: options.delimiter,
		lengthMarker: options.lengthMarker
	});
	writer.push(depth, `${formattedHeader}`);
	writeTabularRows(rows, header, writer, depth + 1, options);
}
function extractTabularHeader(rows) {
	if (rows.length === 0) return;
	const firstRow = rows[0];
	const firstKeys = Object.keys(firstRow);
	if (firstKeys.length === 0) return;
	if (isTabularArray(rows, firstKeys)) return firstKeys;
}
function isTabularArray(rows, header) {
	for (const row of rows) {
		if (Object.keys(row).length !== header.length) return false;
		for (const key of header) {
			if (!(key in row)) return false;
			if (!isJsonPrimitive(row[key])) return false;
		}
	}
	return true;
}
function writeTabularRows(rows, header, writer, depth, options) {
	for (const row of rows) {
		const joinedValue = encodeAndJoinPrimitives(header.map((key) => row[key]), options.delimiter);
		writer.push(depth, joinedValue);
	}
}
function encodeMixedArrayAsListItems(prefix, items, writer, depth, options) {
	const header = formatHeader(items.length, {
		key: prefix,
		delimiter: options.delimiter,
		lengthMarker: options.lengthMarker
	});
	writer.push(depth, header);
	for (const item of items) encodeListItemValue(item, writer, depth + 1, options);
}
function encodeObjectAsListItem(obj, writer, depth, options) {
	const keys = Object.keys(obj);
	if (keys.length === 0) {
		writer.push(depth, LIST_ITEM_MARKER);
		return;
	}
	const firstKey = keys[0];
	const encodedKey = encodeKey(firstKey);
	const firstValue = obj[firstKey];
	if (isJsonPrimitive(firstValue)) writer.pushListItem(depth, `${encodedKey}: ${encodePrimitive(firstValue, options.delimiter)}`);
	else if (isJsonArray(firstValue)) if (isArrayOfPrimitives(firstValue)) {
		const formatted = encodeInlineArrayLine(firstValue, options.delimiter, firstKey, options.lengthMarker);
		writer.pushListItem(depth, formatted);
	} else if (isArrayOfObjects(firstValue)) {
		const header = extractTabularHeader(firstValue);
		if (header) {
			const formattedHeader = formatHeader(firstValue.length, {
				key: firstKey,
				fields: header,
				delimiter: options.delimiter,
				lengthMarker: options.lengthMarker
			});
			writer.pushListItem(depth, formattedHeader);
			writeTabularRows(firstValue, header, writer, depth + 1, options);
		} else {
			writer.pushListItem(depth, `${encodedKey}[${firstValue.length}]:`);
			for (const item of firstValue) encodeObjectAsListItem(item, writer, depth + 1, options);
		}
	} else {
		writer.pushListItem(depth, `${encodedKey}[${firstValue.length}]:`);
		for (const item of firstValue) encodeListItemValue(item, writer, depth + 1, options);
	}
	else if (isJsonObject(firstValue)) if (Object.keys(firstValue).length === 0) writer.pushListItem(depth, `${encodedKey}:`);
	else {
		writer.pushListItem(depth, `${encodedKey}:`);
		encodeObject(firstValue, writer, depth + 2, options);
	}
	for (let i = 1; i < keys.length; i++) {
		const key = keys[i];
		encodeKeyValuePair(key, obj[key], writer, depth + 1, options);
	}
}
function encodeListItemValue(value, writer, depth, options) {
	if (isJsonPrimitive(value)) writer.pushListItem(depth, encodePrimitive(value, options.delimiter));
	else if (isJsonArray(value) && isArrayOfPrimitives(value)) {
		const inline = encodeInlineArrayLine(value, options.delimiter, void 0, options.lengthMarker);
		writer.pushListItem(depth, inline);
	} else if (isJsonObject(value)) encodeObjectAsListItem(value, writer, depth, options);
}

//#endregion
//#region src/index.ts
function encode(input, options) {
	return encodeValue(normalizeValue(input), resolveOptions(options));
}
function decode(input, options) {
	const resolvedOptions = resolveDecodeOptions(options);
	const scanResult = toParsedLines(input, resolvedOptions.indent, resolvedOptions.strict);
	if (scanResult.lines.length === 0) throw new TypeError("Cannot decode empty input: input must be a non-empty string");
	return decodeValueFromLines(new LineCursor(scanResult.lines, scanResult.blankLines), resolvedOptions);
}
function resolveOptions(options) {
	return {
		indent: options?.indent ?? 2,
		delimiter: options?.delimiter ?? DEFAULT_DELIMITER,
		lengthMarker: options?.lengthMarker ?? false
	};
}
function resolveDecodeOptions(options) {
	return {
		indent: options?.indent ?? 2,
		strict: options?.strict ?? true
	};
}

//#endregion
export { DEFAULT_DELIMITER, DELIMITERS, decode, encode };