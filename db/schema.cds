namespace products;

@cds.persistence.exists
entity IT_ACCESSORY_OPENAI_YOUR_HANA_USER {
  VEC_META : String;
  VEC_TEXT  : LargeString;
  VEC_VECTOR   : cds.Vector;
}