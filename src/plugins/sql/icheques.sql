CREATE TABLE IF NOT EXISTS 'ICHEQUES_CHECKS' (
    'ID' INTEGER PRIMARY KEY,
    'CREATION' INTEGER,
    'CMC' TEXT NOT NULL,
    'CPF' TEXT,
    'CNPJ' TEXT,
    'EXPIRE' TEXT, /* YYYYMMDD */
    'AMMOUNT' INTEGER, /* X / 100 */
    'STATUS' INTEGER,
    'PUSH_ID' TEXT,
    'OBSERVATION' TEXT,
    'COMPANY' TEXT,
    'DOCUMENT' TEXT,
    'QUERY_STATUS' INT,
    'OCURRENCE_CODE' INT,
    'SITUATION' TEXT,
    'DISPLAY'  TEXT,
    'OCURRENCE' TEXT,
    'EXCEPTION_MESSAGE' TEXT,
    'EXCEPTION_CODE' INT,
    'EXCEPTION_TYPE' TEXT,
    'EXCEPTION_PUSHABLE' INT,
    'LAST_UPDATE' INT,
    CHECK ('CPF' NOT NULL OR 'CNPJ' NOT NULL)
); /* iCheques Checks */