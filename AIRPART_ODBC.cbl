       IDENTIFICATION DIVISION.
       PROGRAM-ID. AIRPARTOD.

       DATA DIVISION.
       WORKING-STORAGE SECTION.

       01  SQL-HANDLE        USAGE POINTER.
       01  SQL-ENV           USAGE POINTER.

       01  WS-PART-ID        PIC X(15) VALUE "ENG-FAN-002".
       01  WS-PART-NAME      PIC X(80) VALUE "Engine Fan".
       01  WS-SUPPLIER-ID    PIC X(10) VALUE "SUPP001".
       01  WS-BATCH-NO       PIC X(12) VALUE "BATCHA02".
       01  WS-STATUS         PIC X(1)  VALUE "A".

       PROCEDURE DIVISION.

           DISPLAY "Simulating DB2 insert via ODBC".
           DISPLAY "Part ID      : " WS-PART-ID.
           DISPLAY "Part Name    : " WS-PART-NAME.
           DISPLAY "Supplier ID  : " WS-SUPPLIER-ID.
           DISPLAY "Batch No     : " WS-BATCH-NO.
           DISPLAY "Status       : " WS-STATUS.

           DISPLAY "Record logically inserted into DB2".

           STOP RUN.
