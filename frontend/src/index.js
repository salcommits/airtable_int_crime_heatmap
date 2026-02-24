import {initializeBlock} from '@airtable/blocks/interface/ui';
import '../styles/style.css';
import App from './App';

document.body.classList.add(
    'govuk-template__body',
    'govuk-body',
    'js-enabled',
    'govuk-frontend-supported',
);

initializeBlock({interface: () => <App />});
