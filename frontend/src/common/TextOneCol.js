export function TextOneCol({title, children}) {
    return (
        <section>
            {title ? (
                <h2 className="govuk-heading-m">{title}</h2>
            ) : null}
            <div>
                <p className="govuk-body">{children}</p>
            </div>
        </section>
    );
}

