import {useBase, useCustomProperties, useRecords} from '@airtable/blocks/interface/ui';
import {FieldType} from '@airtable/blocks/interface/models';
import {OverviewTextOneCol} from './components/text-one-col/OverviewTextOneCol';
import {SearchAreaTwoCol} from './components/search-area/SearchAreaTwoCol';

function getCustomProperties(base) {
    const defaultSearchRequestsTable =
        base.tables.find(table => table.name.toLowerCase().includes('search')) ||
        base.tables[0];

    const defaultCrimesTable =
        base.tables.find(table => table.name.toLowerCase().includes('crimes')) ||
        base.tables[0];

    const isTextField = field => field.config.type === FieldType.SINGLE_LINE_TEXT;
    const isMonthField = field =>
        field.config.type === FieldType.DATE ||
        field.config.type === FieldType.DATE_TIME ||
        field.config.type === FieldType.SINGLE_SELECT;

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

export default function App() {
    const base = useBase();
    const {customPropertyValueByKey, errorState} = useCustomProperties(getCustomProperties);

    if (errorState) {
        return <div>There was a problem loading custom properties.</div>;
    }

    const searchRequestsTable = customPropertyValueByKey.searchRequestsTable;
    const postcodeField = customPropertyValueByKey.postcodeField;
    const monthField = customPropertyValueByKey.monthField;
    const crimesTable = customPropertyValueByKey.crimesTable;
    const crimesPostcodeField = customPropertyValueByKey.crimesPostcodeField;
    const crimesMonthField = customPropertyValueByKey.crimesMonthField;

    if (
        !searchRequestsTable ||
        !postcodeField ||
        !monthField ||
        !crimesTable ||
        !crimesPostcodeField ||
        !crimesMonthField
    ) {
        return (
            <div>
                <OverviewTextOneCol />
                <p>
                    Configure the Search Requests table + fields and the Crimes table + fields in
                    the properties panel to use this interface.
                </p>
            </div>
        );
    }

    const searchRequestRecords = useRecords(searchRequestsTable);
    const crimesRecords = useRecords(crimesTable);

    return (
        <div>
            <OverviewTextOneCol />
            <SearchAreaTwoCol
                searchRequestsTable={searchRequestsTable}
                searchRequestRecords={searchRequestRecords}
                searchPostcodeField={postcodeField}
                searchMonthField={monthField}
                crimesTable={crimesTable}
                crimesRecords={crimesRecords}
                crimesPostcodeField={crimesPostcodeField}
                crimesMonthField={crimesMonthField}
            />
        </div>
    );
}

