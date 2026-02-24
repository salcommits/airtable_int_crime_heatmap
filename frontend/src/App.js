import {useCustomProperties, useRecords} from '@airtable/blocks/interface/ui';
import {OverviewTextOneCol} from './components/text-one-col/OverviewTextOneCol';
import {SearchAreaTwoCol} from './components/search-area/SearchAreaTwoCol';
import {getCustomProperties} from './config/customProperties';

export default function App() {
    const {customPropertyValueByKey, errorState} = useCustomProperties(getCustomProperties);

    if (errorState) {
        return (
            <div className="govuk-width-container govuk-!-padding-top-4">
                <p className="govuk-body">There was a problem loading custom properties.</p>
            </div>
        );
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
            <div className="govuk-width-container govuk-!-padding-top-4">
                <OverviewTextOneCol />
                <p className="govuk-body">
                    Configure the Search Requests table + fields and the Crimes table + fields in
                    the properties panel to use this interface.
                </p>
            </div>
        );
    }

    const searchRequestRecords = useRecords(searchRequestsTable);
    const crimesRecords = useRecords(crimesTable);

    return (
        <div className="govuk-width-container govuk-!-padding-top-4 govuk-!-padding-bottom-4">
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

