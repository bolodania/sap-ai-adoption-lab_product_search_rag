namespace catalog;

@cds.persistence.exists
entity UPDATED_DEV_1_RMILLERYOUR_NUMBER {
  VEC_META : String;
  VEC_TEXT  : LargeString;
  VEC_VECTOR   : cds.Vector;
}