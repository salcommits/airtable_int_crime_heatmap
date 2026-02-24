import {FieldType} from '@airtable/blocks/interface/models';

const isTextField = field =>
    field.config.type === FieldType.SINGLE_LINE_TEXT ||
    field.config.type === FieldType.FORMULA;
const isMonthField = field =>
    field.config.type === FieldType.DATE ||
    field.config.type === FieldType.DATE_TIME ||
    field.config.type === FieldType.SINGLE_SELECT ||
    field.config.type === FieldType.MULTIPLE_SELECTS ||
    field.config.type === FieldType.SINGLE_LINE_TEXT;

export function getCustomProperties(base) {
    const defaultSearchRequestsTable =
        base.tables.find(table => table.name.toLowerCase().includes('search')) ||
        base.tables[0];

    const defaultCrimesTable =
        base.tables.find(table => table.name.toLowerCase().includes('crimes')) ||
        base.tables[0];

    const postcodeDefault =
        defaultSearchRequestsTable &&
        defaultSearchRequestsTable.fields.find(
            field => isTextField(field) && field.name.toLowerCase().includes('postcode'),
        );

    const monthDefault =
        defaultSearchRequestsTable &&
        defaultSearchRequestsTable.fields.find(
            field => isMonthField(field) && field.name.toLowerCase().includes('month'),
        );

    const crimesPostcodeDefault =
        defaultCrimesTable &&
        defaultCrimesTable.fields.find(
            field => isTextField(field) && field.name.toLowerCase().includes('postcode'),
        );

    const crimesMonthDefault =
        defaultCrimesTable &&
        defaultCrimesTable.fields.find(
            field => isMonthField(field) && field.name.toLowerCase().includes('month'),
        );

    return [
        {
            key: 'searchRequestsTable',
            label: 'Search Requests table',
            type: 'table',
            defaultValue: defaultSearchRequestsTable,
        },
        {
            key: 'postcodeField',
            label: 'Postcode field',
            type: 'field',
            table: defaultSearchRequestsTable,
            shouldFieldBeAllowed: isTextField,
            defaultValue: postcodeDefault,
        },
        {
            key: 'monthField',
            label: 'Month (YYYY-MM) field',
            type: 'field',
            table: defaultSearchRequestsTable,
            shouldFieldBeAllowed: isMonthField,
            defaultValue: monthDefault,
        },
        {
            key: 'crimesTable',
            label: 'Crimes table',
            type: 'table',
            defaultValue: defaultCrimesTable,
        },
        {
            key: 'crimesPostcodeField',
            label: 'Crimes postcode field',
            type: 'field',
            table: defaultCrimesTable,
            shouldFieldBeAllowed: isTextField,
            defaultValue: crimesPostcodeDefault,
        },
        {
            key: 'crimesMonthField',
            label: 'Crimes month field',
            type: 'field',
            table: defaultCrimesTable,
            shouldFieldBeAllowed: isMonthField,
            defaultValue: crimesMonthDefault,
        },
    ];
}

