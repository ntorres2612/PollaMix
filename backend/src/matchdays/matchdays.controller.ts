import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { MatchdaysService } from './matchdays.service';
import { CreateMatchdayDto } from './dto/create-matchday.dto';
import { UpdateMatchdayDto } from './dto/update-matchday.dto';

@Controller('matchdays')
export class MatchdaysController {
  constructor(private readonly matchdaysService: MatchdaysService) {}

  @Post()
  create(@Body() createMatchdayDto: CreateMatchdayDto) {
    return this.matchdaysService.create(createMatchdayDto);
  }

  @Get()
  findAll() {
    return this.matchdaysService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.matchdaysService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateMatchdayDto: UpdateMatchdayDto) {
    return this.matchdaysService.update(+id, updateMatchdayDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.matchdaysService.remove(+id);
  }
}
