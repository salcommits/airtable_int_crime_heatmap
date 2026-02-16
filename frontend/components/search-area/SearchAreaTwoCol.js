import {useState, useMemo} from 'react';

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
    const [selectedMonth, setSelectedMonth] = useState('');
    const [hasSearched, setHasSearched] = useState(false);
    const [newPostcode, setNewPostcode] = useState('');
    const [newMonth, setNewMonth] = useState('');
    const [isSaving, setIsSaving] = useState(false);

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
            .map(record => record.getCellValueAsString(searchMonthField))
            .filter(value => value && value.trim().length > 0);
        return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
    }, [searchRequestRecords, searchPostcodeField, searchMonthField, selectedPostcode]);

    const matchingRecords = useMemo(() => {
        if (!selectedPostcode || !selectedMonth) {
            return [];
        }
        return crimesRecords.filter(
            record =>
                record.getCellValueAsString(crimesPostcodeField) === selectedPostcode &&
                record.getCellValueAsString(crimesMonthField) === selectedMonth,
        );
    }, [crimesRecords, crimesPostcodeField, crimesMonthField, selectedPostcode, selectedMonth]);

    const categoryField = crimesTable.fields.find(field => field.name === 'Category');
    const locationField = crimesTable.fields.find(field => field.name === 'Location');
    const outcomeField = crimesTable.fields.find(field => field.name === 'Outcome Category');
    const latitudeField = crimesTable.fields.find(field => field.name === 'Latitude');
    const longitudeField = crimesTable.fields.find(field => field.name === 'Longitude');

    async function handleCreateSearch() {
        const trimmedPostcode = newPostcode.trim();
        const trimmedMonth = newMonth.trim();

        if (!trimmedPostcode || !trimmedMonth) {
            // eslint-disable-next-line no-alert
            alert('Please enter a postcode and select a month.');
            return;
        }

        const fields = {
            [searchPostcodeField.id]: trimmedPostcode,
            [searchMonthField.id]: `${trimmedMonth}-01`,
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
            setNewPostcode('');
            setNewMonth('');
        } finally {
            setIsSaving(false);
        }
    }

    function handleRunSearch() {
        if (!selectedPostcode || !selectedMonth) {
            // eslint-disable-next-line no-alert
            alert('Select a postcode and month before running a search.');
            return;
        }
        setHasSearched(true);
    }

    return (
        <section>
            <h2>Search</h2>
            <div className="two-col">
                <div className="two-col__panel">
                    <h3>Use an existing search</h3>
                    <p>
                        Pick a postcode and month from searches that already exist in this
                        workspace.
                    </p>
                    <div className="two-col__field-group">
                        <label className="two-col__label" htmlFor="existing-postcode">
                            Postcode
                        </label>
                        <select
                            id="existing-postcode"
                            className="two-col__select"
                            value={selectedPostcode}
                            onChange={event => {
                                setSelectedPostcode(event.target.value);
                                setSelectedMonth('');
                            }}
                        >
                            <option value="" disabled>
                                Select a postcode
                            </option>
                            {postcodes.map(postcode => (
                                <option key={postcode} value={postcode}>
                                    {postcode}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="two-col__field-group">
                        <label className="two-col__label" htmlFor="existing-month">
                            Month
                        </label>
                        <select
                            id="existing-month"
                            className="two-col__select"
                            value={selectedMonth}
                            onChange={event => setSelectedMonth(event.target.value)}
                            disabled={!selectedPostcode}
                        >
                            <option value="" disabled>
                                Select a month
                            </option>
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
                            className="two-col__button"
                            onClick={handleRunSearch}
                            disabled={!selectedPostcode || !selectedMonth}
                        >
                            Search
                        </button>
                    </div>
                </div>
                <div className="two-col__panel">
                    <h3>Create a new search</h3>
                    <p>
                        Add a new postcode and month. This will become part of the growing
                        search database.
                    </p>
                    <div className="two-col__field-group">
                        <label className="two-col__label" htmlFor="new-postcode">
                            Postcode
                        </label>
                        <input
                            id="new-postcode"
                            className="two-col__input"
                            type="text"
                            placeholder="e.g. SW1A 1AA"
                            value={newPostcode}
                            onChange={event => setNewPostcode(event.target.value)}
                        />
                    </div>
                    <div className="two-col__field-group">
                        <label className="two-col__label" htmlFor="new-month">
                            Month (YYYY-MM)
                        </label>
                        <input
                            id="new-month"
                            className="two-col__input"
                            type="month"
                            value={newMonth}
                            onChange={event => setNewMonth(event.target.value)}
                        />
                    </div>
                    <button
                        type="button"
                        className="two-col__button"
                        onClick={handleCreateSearch}
                        disabled={isSaving}
                    >
                        {isSaving ? 'Adding…' : 'Add search'}
                    </button>
                </div>
            </div>
            {hasSearched && (
                <section style={{marginTop: 24}}>
                    <h3>
                        Results area — {selectedPostcode || 'no postcode selected'}{' '}
                        {selectedMonth ? `(${selectedMonth})` : ''}
                    </h3>
                    {matchingRecords.length === 0 ? (
                        <p>No matching search requests found yet.</p>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Postcode</th>
                                    <th>Month</th>
                                    {categoryField && <th>Category</th>}
                                    {locationField && <th>Location</th>}
                                    {outcomeField && <th>Outcome</th>}
                                    {latitudeField && <th>Latitude</th>}
                                    {longitudeField && <th>Longitude</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {matchingRecords.map(record => (
                                    <tr key={record.id}>
                                        <td>
                                            {record.getCellValueAsString(crimesPostcodeField) ||
                                                '—'}
                                        </td>
                                        <td>
                                            {record.getCellValueAsString(crimesMonthField) ||
                                                '—'}
                                        </td>
                                        {categoryField && (
                                            <td>
                                                {record.getCellValueAsString(categoryField) ||
                                                    '—'}
                                            </td>
                                        )}
                                        {locationField && (
                                            <td>
                                                {record.getCellValueAsString(locationField) ||
                                                    '—'}
                                            </td>
                                        )}
                                        {outcomeField && (
                                            <td>
                                                {record.getCellValueAsString(outcomeField) || '—'}
                                            </td>
                                        )}
                                        {latitudeField && (
                                            <td>
                                                {record.getCellValueAsString(latitudeField) || '—'}
                                            </td>
                                        )}
                                        {longitudeField && (
                                            <td>
                                                {record.getCellValueAsString(longitudeField) ||
                                                    '—'}
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </section>
            )}
        </section>
    );
}

