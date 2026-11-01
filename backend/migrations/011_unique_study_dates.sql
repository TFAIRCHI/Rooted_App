CREATE UNIQUE INDEX one_study_per_series_date ON slots(church_id, series_id, local_date);
