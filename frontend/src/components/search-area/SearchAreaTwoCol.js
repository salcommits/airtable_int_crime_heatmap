import {useState, useMemo, useEffect} from 'react';
import {FieldType} from '@airtable/blocks/interface/models';

export function SearchAreaTwoCol({
    searchRequestsTable,
    searchRequestRecords,
    searchPostcodeField,
    searchMonthField,
    crimesTable,
    crimesRecords,
    crimesPostcodeField,
    crimesMonthField,
}) {
    const [selectedPostcode, setSelectedPostcode] = useState('');
    const [selectedMonths, setSelectedMonths] = useState([]);
    const [hasSearched, setHasSearched] = useState(false);
    const [showAiAnalysis, setShowAiAnalysis] = useState(false);
    const [newPostcode, setNewPostcode] = useState('');
    const [newMonth, setNewMonth] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isAwaitingResults, setIsAwaitingResults] = useState(false);

    const monthFieldType = searchMonthField?.config?.type;

    function buildMonthCellValue(monthValue) {
        if (monthFieldType === FieldType.MULTIPLE_SELECTS) {
            return [{name: monthValue}];
        }

        if (monthFieldType === FieldType.SINGLE_SELECT) {
            return {name: monthValue};
        }

        if (monthFieldType === FieldType.DATE || monthFieldType === FieldType.DATE_TIME) {
            return `${monthValue}-01`;
        }

        return monthValue;
    }

    async function ensureSelectOption(field, value) {
        if (!field || !value) {
            return;
        }
        if (field.config.type !== FieldType.SINGLE_SELECT && field.config.type !== FieldType.MULTIPLE_SELECTS) {
            return;
        }
        if (typeof field.updateOptionsAsync !== 'function') {
            return;
        }
        const choices = field.options?.choices || [];
        const exists = choices.some(choice => choice.name === value);
        if (exists) {
            return;
        }
        await field.updateOptionsAsync({
            choices: [...choices, {name: value}],
        });
    }

    function formatMonthValue(value) {
        if (!value) {
            return '';
        }
        const trimmed = `${value}`.trim();
        if (trimmed.length >= 7) {
            return trimmed.slice(0, 7);
        }
        return trimmed;
    }

    function getMonthValues(record, field) {
        if (!field) {
            return [];
        }

        const fieldType = field.config.type;
        const cellValue = record.getCellValue(field);

        if (fieldType === FieldType.MULTIPLE_SELECTS) {
            return (cellValue || [])
                .map(option => formatMonthValue(option?.name))
                .filter(Boolean);
        }

        if (fieldType === FieldType.SINGLE_SELECT) {
            return cellValue ? [formatMonthValue(cellValue.name)] : [];
        }

        if (fieldType === FieldType.DATE || fieldType === FieldType.DATE_TIME) {
            return [formatMonthValue(record.getCellValueAsString(field))].filter(Boolean);
        }

        return [formatMonthValue(record.getCellValueAsString(field))].filter(Boolean);
    }

    useEffect(() => {
        setHasSearched(Boolean(selectedPostcode && selectedMonths.length > 0));
    }, [selectedPostcode, selectedMonths]);

    useEffect(() => {
        setShowAiAnalysis(false);
    }, [selectedPostcode, selectedMonths]);

    const postcodes = useMemo(() => {
        const values = searchRequestRecords
            .map(record => record.getCellValueAsString(searchPostcodeField))
            .filter(value => value && value.trim().length > 0);
        return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
    }, [searchRequestRecords, searchPostcodeField]);

    const monthsForSelectedPostcode = useMemo(() => {
        if (!selectedPostcode) {
            return [];
        }
        const values = searchRequestRecords
            .filter(
                record =>
                    record.getCellValueAsString(searchPostcodeField) === selectedPostcode,
            )
            .flatMap(record => getMonthValues(record, searchMonthField));
        return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
    }, [searchRequestRecords, searchPostcodeField, searchMonthField, selectedPostcode]);

    const selectedSearchRequest = useMemo(() => {
        if (!selectedPostcode || selectedMonths.length === 0) {
            return null;
        }
        const selectedSet = new Set(selectedMonths);
        return (
            searchRequestRecords.find(record => {
                if (record.getCellValueAsString(searchPostcodeField) !== selectedPostcode) {
                    return false;
                }
                const recordMonths = getMonthValues(record, searchMonthField);
                return recordMonths.some(month => selectedSet.has(month));
            }) || null
        );
    }, [searchRequestRecords, searchPostcodeField, searchMonthField, selectedPostcode, selectedMonths]);

    const aiAssistField = useMemo(() => {
        const fields = searchRequestsTable.fields || [];
        return (
            fields.find(field => field.name === 'AI Assist') ||
            fields.find(field => field.name.toLowerCase() === 'ai assist') ||
            fields.find(field => field.name.toLowerCase().includes('ai assist')) ||
            null
        );
    }, [searchRequestsTable]);

    const matchingRecords = useMemo(() => {
        if (!selectedPostcode || selectedMonths.length === 0) {
            return [];
        }
        const selectedSet = new Set(selectedMonths);
        return crimesRecords.filter(
            record => {
                if (record.getCellValueAsString(crimesPostcodeField) !== selectedPostcode) {
                    return false;
                }
                const recordMonths = getMonthValues(record, crimesMonthField);
                return recordMonths.some(month => selectedSet.has(month));
            },
        );
    }, [crimesRecords, crimesPostcodeField, crimesMonthField, selectedPostcode, selectedMonths]);

    useEffect(() => {
        if (!selectedPostcode || selectedMonths.length === 0) {
            setIsAwaitingResults(false);
            return;
        }
        if (matchingRecords.length > 0) {
            setIsAwaitingResults(false);
        }
    }, [matchingRecords.length, selectedMonths, selectedPostcode]);

    useEffect(() => {
        if (!isAwaitingResults) {
            return undefined;
        }
        const timeoutId = setTimeout(() => {
            setIsAwaitingResults(false);
        }, 15000);

        return () => clearTimeout(timeoutId);
    }, [isAwaitingResults]);

    const categoryField = crimesTable.fields.find(field => field.name === 'Rename Category');
    const locationField = crimesTable.fields.find(field => field.name === 'Location');
    const outcomeField = crimesTable.fields.find(field => field.name === 'Outcome Category');
    const latitudeField = crimesTable.fields.find(field => field.name === 'Latitude');
    const longitudeField = crimesTable.fields.find(field => field.name === 'Longitude');

    function getRecordValue(record, key) {
        const fieldMap = {
            postcode: crimesPostcodeField,
            month: crimesMonthField,
            category: categoryField,
            location: locationField,
            outcome: outcomeField,
            latitude: latitudeField,
            longitude: longitudeField,
        };

        const field = fieldMap[key];
        return field ? record.getCellValueAsString(field) : '';
    }

    const sortedRecords = useMemo(() => {
        if (!categoryField) {
            return matchingRecords;
        }
        const sorted = [...matchingRecords];
        sorted.sort((a, b) => {
            const aValue = getRecordValue(a, 'category');
            const bValue = getRecordValue(b, 'category');
            return aValue.localeCompare(bValue);
        });
        return sorted;
    }, [matchingRecords, categoryField]);

    async function handleCreateSearch() {
        const trimmedPostcode = newPostcode.trim();
        const trimmedMonth = newMonth.trim();

        if (!trimmedPostcode || !trimmedMonth) {
            // eslint-disable-next-line no-alert
            alert('Please enter a postcode and select a month.');
            return;
        }

        await ensureSelectOption(searchMonthField, trimmedMonth);

        const fields = {
            [searchPostcodeField.id]: trimmedPostcode,
            [searchMonthField.id]: buildMonthCellValue(trimmedMonth),
        };

        const canCreate = searchRequestsTable.hasPermissionToCreateRecords([{fields}]);
        if (!canCreate) {
            // eslint-disable-next-line no-alert
            alert('You do not have permission to create Search Request records.');
            return;
        }

        try {
            setIsSaving(true);
            await searchRequestsTable.createRecordAsync(fields);
            setIsAwaitingResults(true);
            setNewPostcode('');
            setNewMonth('');
            setSelectedPostcode(trimmedPostcode);
            setSelectedMonths([trimmedMonth]);
        } finally {
            setIsSaving(false);
        }
    }

    function handleRunSearch() {
        if (!selectedPostcode || selectedMonths.length === 0) {
            // eslint-disable-next-line no-alert
            alert('Select a postcode and at least one month before running a search.');
            return;
        }
        setHasSearched(true);
    }

    return (
        <section>
            <h2 className="govuk-heading-m">Search</h2>
            <div className="two-col">
                <div className="two-col__panel">
                    <h3 className="govuk-heading-s">Use an existing search</h3>
                    <p className="govuk-body">
                        Pick a postcode and month from searches that already exist in this
                        workspace.
                    </p>
                    <div className="two-col__field-group">
                        <label className="two-col__label govuk-label" htmlFor="existing-postcode">
                            Postcode
                        </label>
                        <input
                            id="existing-postcode"
                            className="two-col__input govuk-input"
                            list="existing-postcode-list"
                            type="text"
                            placeholder="Start typing a postcode"
                            value={selectedPostcode}
                            onChange={event => {
                                setSelectedPostcode(event.target.value);
                                setSelectedMonths([]);
                            }}
                        />
                        <datalist id="existing-postcode-list">
                            {postcodes.map(postcode => (
                                <option key={postcode} value={postcode} />
                            ))}
                        </datalist>
                    </div>
                    <div className="two-col__field-group">
                        <label className="two-col__label govuk-label" htmlFor="existing-month">
                            Month
                        </label>
                        <select
                            id="existing-month"
                            className="two-col__select govuk-select"
                            value={selectedMonths}
                            onChange={event =>
                                setSelectedMonths(
                                    Array.from(event.target.selectedOptions).map(
                                        option => option.value,
                                    ),
                                )
                            }
                            disabled={!selectedPostcode}
                            multiple
                            size={Math.min(6, Math.max(3, monthsForSelectedPostcode.length))}
                        >
                            {monthsForSelectedPostcode.map(month => (
                                <option key={month} value={month}>
                                    {month}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="two-col__field-group">
                        <button
                            type="button"
                            className="two-col__button govuk-button"
                            onClick={handleRunSearch}
                            disabled={!selectedPostcode || selectedMonths.length === 0}
                        >
                            Search
                        </button>
                    </div>
                </div>
                <div className="two-col__panel">
                    <h3 className="govuk-heading-s">Create a new search</h3>
                    <p className="govuk-body">
                        Add a new postcode and month. This will become part of the growing
                        search database.
                    </p>
                    <div className="two-col__field-group">
                        <label className="two-col__label govuk-label" htmlFor="new-postcode">
                            Postcode
                        </label>
                        <input
                            id="new-postcode"
                            className="two-col__input govuk-input"
                            type="text"
                            placeholder="e.g. SW1A 1AA"
                            value={newPostcode}
                            onChange={event => setNewPostcode(event.target.value)}
                        />
                    </div>
                    <div className="two-col__field-group">
                        <label className="two-col__label govuk-label" htmlFor="new-month">
                            Month (YYYY-MM)
                        </label>
                        <input
                            id="new-month"
                            className="two-col__input govuk-input"
                            type="month"
                            value={newMonth}
                            onChange={event => setNewMonth(event.target.value)}
                        />
                    </div>
                    <button
                        type="button"
                        className="two-col__button govuk-button"
                        onClick={handleCreateSearch}
                        disabled={isSaving}
                    >
                        {isSaving ? 'Adding…' : 'Add search'}
                    </button>
                </div>
            </div>
            {hasSearched && (
                <section style={{marginTop: 24}}>
                    <h3 className="govuk-heading-s">
                        Results area — {selectedPostcode || 'no postcode selected'}{' '}
                        {selectedMonths.length > 0 ? `(${selectedMonths.join(', ')})` : ''}
                    </h3>
                    <div className="two-col__field-group">
                        <button
                            type="button"
                            className="two-col__button govuk-button"
                            onClick={() => setShowAiAnalysis(true)}
                        >
                            AI Analysis
                        </button>
                    </div>
                    {matchingRecords.length === 0 ? (
                        <p className="govuk-body">
                            {isAwaitingResults
                                ? 'Data loading...'
                                : 'No matching search requests found yet.'}
                        </p>
                    ) : (
                        <>
                            <div className="table-scroll">
                                <table className="govuk-table">
                                <thead>
                                    <tr className="govuk-table__row">
                                        <th className="govuk-table__header">Postcode</th>
                                        <th className="govuk-table__header">Month</th>
                                        {categoryField && (
                                            <th className="govuk-table__header">Category</th>
                                        )}
                                        {locationField && (
                                            <th className="govuk-table__header">Location</th>
                                        )}
                                        {outcomeField && (
                                            <th className="govuk-table__header">Outcome</th>
                                        )}
                                        {latitudeField && (
                                            <th className="govuk-table__header">Latitude</th>
                                        )}
                                        {longitudeField && (
                                            <th className="govuk-table__header">Longitude</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedRecords.map(record => (
                                        <tr key={record.id} className="govuk-table__row">
                                            <td className="govuk-table__cell">
                                                {record.getCellValueAsString(crimesPostcodeField) ||
                                                    '—'}
                                            </td>
                                            <td className="govuk-table__cell">
                                                {record.getCellValueAsString(crimesMonthField) ||
                                                    '—'}
                                            </td>
                                            {categoryField && (
                                                <td className="govuk-table__cell">
                                                    {record.getCellValueAsString(categoryField) ||
                                                        '—'}
                                                </td>
                                            )}
                                            {locationField && (
                                                <td className="govuk-table__cell">
                                                    {record.getCellValueAsString(locationField) ||
                                                        '—'}
                                                </td>
                                            )}
                                            {outcomeField && (
                                                <td className="govuk-table__cell">
                                                    {record.getCellValueAsString(outcomeField) ||
                                                        '—'}
                                                </td>
                                            )}
                                            {latitudeField && (
                                                <td className="govuk-table__cell">
                                                    {record.getCellValueAsString(latitudeField) ||
                                                        '—'}
                                                </td>
                                            )}
                                            {longitudeField && (
                                                <td className="govuk-table__cell">
                                                    {record.getCellValueAsString(longitudeField) ||
                                                        '—'}
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                                </table>
                            </div>
                        </>
                    )}
                    {showAiAnalysis && (
                        <div className="ai-modal">
                            <div className="ai-modal__backdrop" onClick={() => setShowAiAnalysis(false)} />
                            <div className="ai-modal__panel">
                                <div className="ai-modal__header">
                                    <h4 className="govuk-heading-s">AI Analysis</h4>
                                    <button
                                        type="button"
                                        className="govuk-button"
                                        onClick={() => setShowAiAnalysis(false)}
                                    >
                                        Close
                                    </button>
                                </div>
                                <div className="ai-modal__body">
                                    <p className="govuk-body">
                                        {aiAssistField && selectedSearchRequest
                                            ? selectedSearchRequest.getCellValueAsString(aiAssistField) ||
                                              'No analysis available yet.'
                                            : 'AI Assist field not found for this view.'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </section>
            )}
        </section>
    );
}

