import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parse } from 'acorn';
import { normalizeGuests } from '../src/lib/roster.mjs';

const DEFAULT_SOURCE = fileURLToPath(new URL('../data/guests.default.js', import.meta.url));
const DEFAULT_OUTPUT = fileURLToPath(
  new URL('../native/CheckIn007/Resources/default-guests.json', import.meta.url),
);

const GLOBAL_NAME = 'CHECKIN007_DEFAULT_GUESTS';

function isGlobalTarget(node) {
  // Accept both `CHECKIN007_DEFAULT_GUESTS = [...]` and `window.CHECKIN007_DEFAULT_GUESTS = [...]`.
  if (node.type === 'Identifier') return node.name === GLOBAL_NAME;
  return (
    node.type === 'MemberExpression' &&
    node.property?.type === 'Identifier' &&
    node.property.name === GLOBAL_NAME
  );
}

function stringLiteral(property, key) {
  if (property.key?.name !== key && property.key?.value !== key) return undefined;
  if (property.value?.type !== 'Literal' || typeof property.value.value !== 'string') {
    throw new Error(`Guest property "${key}" must be a string literal.`);
  }
  return property.value.value;
}

export function extractDefaultGuests(sourceText) {
  /**
   * Parse the `window.CHECKIN007_DEFAULT_GUESTS = [ ... ]` assignment and return the raw
   * guest rows as `{ name, table }` objects (an optional string `id` is preserved when
   * present). The real web roster rows carry only `{ name, table }` and NO `id` — IDs are
   * generated downstream by `normalizeGuests` via `slugify`, so `id` is NOT required input.
   * Throws only when the source is not a single array assignment of object literals whose
   * `name` and `table` are string literals.
   */
  const program = parse(String(sourceText ?? ''), {
    ecmaVersion: 'latest',
    sourceType: 'script',
  });

  let arrayNode = null;
  for (const statement of program.body) {
    if (statement.type !== 'ExpressionStatement') continue;
    const expression = statement.expression;
    if (
      expression.type === 'AssignmentExpression' &&
      expression.operator === '=' &&
      isGlobalTarget(expression.left) &&
      expression.right.type === 'ArrayExpression'
    ) {
      arrayNode = expression.right;
      break;
    }
  }

  if (!arrayNode) {
    throw new Error(`Source has no \`${GLOBAL_NAME} = [ ... ]\` array assignment.`);
  }

  return arrayNode.elements.map((element, index) => {
    if (!element || element.type !== 'ObjectExpression') {
      throw new Error(`Guest at index ${index} is not an object literal.`);
    }
    const row = {};
    for (const property of element.properties) {
      if (property.type !== 'Property') {
        throw new Error(`Guest at index ${index} has an unsupported property.`);
      }
    }
    const name = element.properties
      .map((property) => stringLiteral(property, 'name'))
      .find((value) => value !== undefined);
    const table = element.properties
      .map((property) => stringLiteral(property, 'table'))
      .find((value) => value !== undefined);
    const id = element.properties
      .map((property) => stringLiteral(property, 'id'))
      .find((value) => value !== undefined);

    if (typeof name !== 'string') {
      throw new Error(`Guest at index ${index} is missing a string \`name\`.`);
    }
    if (typeof table !== 'string') {
      throw new Error(`Guest at index ${index} is missing a string \`table\`.`);
    }
    row.name = name;
    row.table = table;
    if (id !== undefined) row.id = id;
    return row;
  });
}

export function serializeNativeGuests(rawRows) {
  /**
   * Run the web app's OWN `normalizeGuests` over the raw rows so the generated `id`,
   * duplicate dropping, and `searchText` are byte-identical to the web client, then serialize
   * as Prettier-conformant JSON (2-space indent, trailing newline) preserving source row
   * order. Returns the file contents string.
   */
  const { guests } = normalizeGuests(rawRows);
  return `${JSON.stringify(guests, null, 2)}\n`;
}

export function writeNativeGuests({ sourcePath = DEFAULT_SOURCE, outputPath = DEFAULT_OUTPUT }) {
  /**
   * Read `sourcePath`, `extractDefaultGuests` the raw rows, then run the web app's OWN
   * `normalizeGuests` (via `serializeNativeGuests`) so the generated `id`, duplicate
   * dropping, and `searchText` are byte-identical to the web client — a single source of
   * truth, no re-implemented slugify to drift. Write the resulting `guests` array as
   * Prettier-conformant JSON (2-space indent, trailing newline) with stable source row
   * order. Return `{ count, outputPath, content }`.
   */
  const sourceText = readFileSync(sourcePath, 'utf8');
  const rawRows = extractDefaultGuests(sourceText);
  const content = serializeNativeGuests(rawRows);
  writeFileSync(outputPath, content, 'utf8');
  const { guests } = normalizeGuests(rawRows);
  return { count: guests.length, outputPath, content };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = writeNativeGuests({});
  console.log(`Wrote ${result.count} guests to ${result.outputPath}`);
}
