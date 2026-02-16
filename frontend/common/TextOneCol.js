export function TextOneCol({title, children}) {
    return (
        <section>
            {title ? (
                <h2>{title}</h2>
            ) : null}
            <div>
                <p>{children}</p>
            </div>
        </section>
    );
}

