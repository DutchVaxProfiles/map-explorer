import { Processor } from "./processor"
import { ParquetProcessor} from "./processor-parquet.ts"
import { CsvProcessor } from "./processor-csv.ts"

export class ProcessorFactory {
  static async create(file: File): Promise<Processor> {
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
    let processor: Processor;

    switch (fileExtension) {
      case 'parquet':
        processor = new ParquetProcessor(file);
        break;
      case 'csv':
        processor = new CsvProcessor(file);
        break;
      default:
        throw new Error(`Unsupported file type: ${fileExtension}`);
    }

    await processor.initialize();
    return processor;
  }
}
